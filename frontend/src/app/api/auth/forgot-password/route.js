import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'node:crypto';
import { normalizeEmail } from '@/lib/auth-native';

const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const resetAttempts = new Map();

function checkResetRateLimit(email) {
  const key = `reset:${email}`;
  const now = Date.now();
  const entry = resetAttempts.get(key);
  if (entry) {
    if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS && now - entry.resetAt < RATE_LIMIT_WINDOW) {
      return false;
    }
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
  try {
    const { email } = await request.json().catch(() => ({}));

    if (!email) {
      return Response.json({ message: genericMessage });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes('@')) {
      return Response.json({ message: genericMessage });
    }

    if (!checkResetRateLimit(normalizedEmail)) {
      return Response.json({ error: true, statusCode: 429, message: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (!user) {
      return Response.json({ message: genericMessage });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });

    if (insertError) {
      return Response.json({ message: genericMessage });
    }



    return Response.json({ message: genericMessage });
  } catch {
    return Response.json({ message: genericMessage });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
