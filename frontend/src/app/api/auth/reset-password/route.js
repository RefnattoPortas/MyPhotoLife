import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/lib/auth-native';

function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getPasswordStrength(password) {
  if (!password) return { level: 'fraca', label: 'Fraca' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 2) return { level: 'fraca', label: 'Fraca' };
  if (score <= 4) return { level: 'media', label: 'Média' };
  return { level: 'forte', label: 'Forte' };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { token, email, password, password_confirm } = body;

  if (!token || !email || !password) {
    return jsonResponse({ error: true, statusCode: 400, message: 'Token, email e nova senha são obrigatórios.' }, 400);
  }

  if (password.length < 8 || password.length > 128) {
    return jsonResponse({ error: true, statusCode: 400, message: 'Senha deve ter entre 8 e 128 caracteres.' }, 400);
  }

  if (password_confirm !== undefined && password !== password_confirm) {
    return jsonResponse({ error: true, statusCode: 400, message: 'Senhas não conferem.' }, 400);
  }

  const strength = getPasswordStrength(password);
  if (strength.level === 'fraca') {
    return jsonResponse({ error: true, statusCode: 400, message: 'Senha muito fraca. Use pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.' }, 400);
  }

  if (supabaseConfigured()) {
    const lookupEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: resetToken, error: findError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .maybeSingle();

    if (findError || !resetToken) {
      return jsonResponse({ error: true, statusCode: 400, message: 'Link de recuperação inválido, expirado ou já utilizado.' }, 400);
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', resetToken.user_id)
      .eq('email', lookupEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (!user) {
      return jsonResponse({ error: true, statusCode: 400, message: 'Link de recuperação inválido, expirado ou já utilizado.' }, 400);
    }

    if (new Date() > new Date(resetToken.expires_at)) {
      return jsonResponse({ error: true, statusCode: 400, message: 'Este link de recuperação expirou. Solicite um novo.' }, 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    await supabaseAdmin.from('password_reset_tokens').update({ used_at: now }).eq('id', resetToken.id);
    await supabaseAdmin.from('users').update({ password_hash: passwordHash }).eq('id', user.id);

    return jsonResponse({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
  }

  const proxyResult = await proxyToBackend(request, { path: '/api/auth/reset-password', body });
  if (proxyResult.body) return jsonResponse(proxyResult.body, proxyResult.status);

  const err = errorResponse('BACKEND_UNAVAILABLE');
  return jsonResponse(err.body, err.status);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
