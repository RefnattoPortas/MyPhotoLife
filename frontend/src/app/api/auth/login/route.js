import bcrypt from 'bcryptjs';
import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  signToken,
  setCookieHeader,
  errorResponse,
} from '@/lib/auth-native';

async function nativeLogin(email, password) {
  const lookupEmail = email.trim().toLowerCase();
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, password_hash, display_name, role, tenant_id')
    .eq('email', lookupEmail)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return null;

  if (!user) return { code: 'INVALID_CREDENTIALS' };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return { code: 'INVALID_CREDENTIALS' };

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug')
    .eq('id', user.tenant_id)
    .single();

  if (tenantError || !tenant) return { code: 'UNEXPECTED' };

  const token = signToken({ sub: user.id, tenantId: user.tenant_id, role: user.role });

  return {
    token,
    csrfToken: token,
    user: { id: user.id, email: user.email, name: user.display_name, role: user.role },
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    setCookie: setCookieHeader(token),
  };
}

function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return jsonResponse({ error: true, statusCode: 400, message: 'Preencha seu e-mail e sua senha.' }, 400);
  }

  if (supabaseConfigured()) {
    const result = await nativeLogin(email, password);
    if (result) {
      if (result.code) {
        const err = errorResponse(result.code);
        return jsonResponse(err.body, err.status);
      }
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': result.setCookie },
      });
    }
  }

  const proxyResult = await proxyToBackend(request, { path: '/api/auth/login', body });
  if (proxyResult.body) {
    return jsonResponse(proxyResult.body, proxyResult.status);
  }

  const err = errorResponse('BACKEND_UNAVAILABLE');
  return jsonResponse(err.body, err.status);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
