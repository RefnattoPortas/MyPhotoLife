import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  normalizeEmail,
  validateSlug,
  signToken,
  setCookieHeader,
  errorResponse,
} from '@/lib/auth-native';

function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

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

async function nativeRegister({ name, email, password, password_confirm, slug }) {
  if (!name || !email || !password || !slug) {
    return { status: 400, body: { error: true, statusCode: 400, message: 'Nome, email, senha e slug são obrigatórios.' } };
  }

  const normalizedName = name.trim();
  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return { status: 400, body: { error: true, statusCode: 400, message: 'Nome deve ter entre 2 e 100 caracteres.' } };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail.includes('@') || normalizedEmail.length > 254) {
    return { status: 400, body: { error: true, statusCode: 400, message: 'Email inválido.' } };
  }

  if (password.length < 8 || password.length > 128) {
    return { status: 400, body: { error: true, statusCode: 400, message: 'Senha deve ter entre 8 e 128 caracteres.' } };
  }

  if (password_confirm !== undefined && password !== password_confirm) {
    return { status: 400, body: { error: true, statusCode: 400, message: 'Senhas não conferem.' } };
  }

  const strength = getPasswordStrength(password);
  if (strength.level === 'fraca') {
    return { status: 400, body: { error: true, statusCode: 400, message: 'Senha muito fraca. Use pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.' } };
  }

  const slugError = validateSlug(slug);
  if (slugError) {
    return { status: 400, body: { error: true, statusCode: 400, message: slugError } };
  }

  const normalizedSlug = normalizeSlug(slug);

  const { data: existing } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .or(`slug.eq.${normalizedSlug},email.eq.${normalizedEmail}`)
    .limit(1);

  if (existing && existing.length > 0) {
    return { status: 409, body: { error: true, statusCode: 409, message: 'Este slug ou email já está em uso.' } };
  }

  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  const { error: tenantInsertError } = await supabaseAdmin
    .from('tenants')
    .insert({ id: tenantId, name: normalizedName, email: normalizedEmail, slug: normalizedSlug, subdomain: normalizedSlug });

  if (tenantInsertError) {
    return { status: 409, body: { error: true, statusCode: 409, message: 'Este slug ou email já está em uso.' } };
  }

  const { error: userInsertError } = await supabaseAdmin
    .from('users')
    .insert({ id: userId, tenant_id: tenantId, email: normalizedEmail, password_hash: passwordHash, display_name: normalizedName, role: 'owner' });

  if (userInsertError) {
    await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
    return { status: 500, body: { error: true, statusCode: 500, message: 'Erro ao criar conta. Tente novamente.' } };
  }

  const token = signToken({ sub: userId, tenantId, role: 'owner' });

  return {
    status: 201,
    body: {
      token,
      csrfToken: token,
      user: { id: userId, email: normalizedEmail, name: normalizedName, role: 'owner', password_strength: strength.label },
      tenant: { id: tenantId, slug: normalizedSlug },
    },
    setCookie: setCookieHeader(token),
  };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  if (supabaseConfigured()) {
    const result = await nativeRegister(body);
    if (result.setCookie) {
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': result.setCookie },
      });
    }
    return jsonResponse(result.body, result.status);
  }

  const proxyResult = await proxyToBackend(request, { path: '/api/auth/register', body });
  if (proxyResult.body) return jsonResponse(proxyResult.body, proxyResult.status);

  const err = errorResponse('BACKEND_UNAVAILABLE');
  return jsonResponse(err.body, err.status);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
