import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {
  normalizeEmail,
  validateSlug,
  signToken,
  setCookieHeader,
  errorResponse,
} from '@/lib/auth-native';

function normalizeSlug(slug) {
  if (!slug) return '';
  return slug.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
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
  try {
    const { name, email, password, password_confirm, slug } = await request.json().catch(() => ({}));

    if (!name || !email || !password || !slug) {
      return Response.json({ error: true, statusCode: 400, message: 'Nome, email, senha e slug são obrigatórios.' }, { status: 400 });
    }

    const normalizedName = name.trim();
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return Response.json({ error: true, statusCode: 400, message: 'Nome deve ter entre 2 e 100 caracteres.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes('@') || normalizedEmail.length > 254) {
      return Response.json({ error: true, statusCode: 400, message: 'Email inválido.' }, { status: 400 });
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

    const slugError = validateSlug(slug);
    if (slugError) {
      return Response.json({ error: true, statusCode: 400, message: slugError }, { status: 400 });
    }

    const normalizedSlug = normalizeSlug(slug);

    if (!supabaseAdmin) {
      const err = errorResponse('BACKEND_UNAVAILABLE');
      return Response.json(err.body, { status: err.status });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .or(`slug.eq.${normalizedSlug},email.eq.${normalizedEmail}`)
      .limit(1);

    if (checkError) {
      const err = errorResponse('BACKEND_UNAVAILABLE');
      return Response.json(err.body, { status: err.status });
    }

    if (existing && existing.length > 0) {
      return Response.json({ error: true, statusCode: 409, message: 'Este slug ou email já está em uso.' }, { status: 409 });
    }

    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    const { error: tenantInsertError } = await supabaseAdmin
      .from('tenants')
      .insert({ id: tenantId, name: normalizedName, email: normalizedEmail, slug: normalizedSlug, subdomain: normalizedSlug });

    if (tenantInsertError) {
      return Response.json({ error: true, statusCode: 409, message: 'Este slug ou email já está em uso.' }, { status: 409 });
    }

    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({ id: userId, tenant_id: tenantId, email: normalizedEmail, password_hash: passwordHash, display_name: normalizedName, role: 'owner' });

    if (userInsertError) {
      await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
      return Response.json({ error: true, statusCode: 500, message: 'Erro ao criar conta. Tente novamente.' }, { status: 500 });
    }

    const token = signToken({ sub: userId, tenantId, role: 'owner' });

    return new Response(JSON.stringify({
      token,
      csrfToken: token,
      user: { id: userId, email: normalizedEmail, name: normalizedName, role: 'owner', password_strength: strength.label },
      tenant: { id: tenantId, slug: normalizedSlug },
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setCookieHeader(token),
      },
    });
  } catch {
    const err = errorResponse('UNEXPECTED');
    return Response.json(err.body, { status: err.status });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
