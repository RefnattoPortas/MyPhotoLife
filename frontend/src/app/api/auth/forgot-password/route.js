import crypto from 'node:crypto';
import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizeEmail } from '@/lib/auth-native';

const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const resetAttempts = new Map();

function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function checkResetRateLimit(email) {
  const key = `reset:${email}`;
  const now = Date.now();
  const entry = resetAttempts.get(key);
  if (entry) {
    if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS && now - entry.resetAt < RATE_LIMIT_WINDOW) return false;
    if (now - entry.resetAt >= RATE_LIMIT_WINDOW) {
      resetAttempts.set(key, { count: 1, resetAt: now });
      return true;
    }
    entry.count++;
    return true;
  }
  resetAttempts.set(key, { count: 1, resetAt: now });
  return true;
}

const genericMessage = 'Se existir uma conta com este email, enviaremos as instruções de recuperação.';

export async function POST(request) {
  const { email } = await request.json().catch(() => ({}));

  if (!email || !email.includes('@')) {
    return jsonResponse({ message: genericMessage });
  }

  const normalizedEmail = normalizeEmail(email);

  if (!checkResetRateLimit(normalizedEmail)) {
    return jsonResponse({ error: true, statusCode: 429, message: 'Muitas tentativas. Tente novamente mais tarde.' }, 429);
  }

  if (supabaseConfigured()) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from('password_reset_tokens')
        .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });
    }

    return jsonResponse({ message: genericMessage });
  }

  const result = await proxyToBackend(request, { path: '/api/auth/forgot-password', body: { email: normalizedEmail } });
  if (result.body) return jsonResponse(result.body, result.status);

  return jsonResponse({ message: genericMessage });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
