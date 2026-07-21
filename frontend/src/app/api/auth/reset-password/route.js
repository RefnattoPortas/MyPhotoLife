import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { normalizeEmail, errorResponse } from '@/lib/auth-native';

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
  try {
    const { token, email, password, password_confirm } = await request.json().catch(() => ({}));

    if (!token || !email || !password) {
      return Response.json({ error: true, statusCode: 400, message: 'Token, email e nova senha são obrigatórios.' }, { status: 400 });
    }

    if (password.length < 8 || password.length > 128) {
      return Response.json({ error: true, statusCode: 400, message: 'Senha deve ter entre 8 e 128 caracteres.' }, { status: 400 });
    }

    if (password_confirm !== undefined && password !== password_confirm) {
      return Response.json({ error: true, statusCode: 400, message: 'Senhas não conferem.' }, { status: 400 });
    }

    const strength = getPasswordStrength(password);
    if (strength.level === 'fraca') {
      return Response.json({ error: true, statusCode: 400, message: 'Senha muito fraca. Use pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (!supabaseAdmin) {
      const err = errorResponse('BACKEND_UNAVAILABLE');
      return Response.json(err.body, { status: err.status });
    }

    const { data: resetToken, error: findError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .maybeSingle();

    if (findError || !resetToken) {
      return Response.json({ error: true, statusCode: 400, message: 'Link de recuperação inválido, expirado ou já utilizado.' }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', resetToken.user_id)
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (!user) {
      return Response.json({ error: true, statusCode: 400, message: 'Link de recuperação inválido, expirado ou já utilizado.' }, { status: 400 });
    }

    if (new Date() > new Date(resetToken.expires_at)) {
      return Response.json({ error: true, statusCode: 400, message: 'Este link de recuperação expirou. Solicite um novo.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const { error: updateTokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: now })
      .eq('id', resetToken.id);

    if (updateTokenError) {
      const err = errorResponse('UNEXPECTED');
      return Response.json(err.body, { status: err.status });
    }

    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', user.id);

    if (updateUserError) {
      const err = errorResponse('UNEXPECTED');
      return Response.json(err.body, { status: err.status });
    }

    return Response.json({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
  } catch {
    const err = errorResponse('UNEXPECTED');
    return Response.json(err.body, { status: err.status });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
