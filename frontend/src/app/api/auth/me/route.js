import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyToken, COOKIE_NAME } from '@/lib/auth-native';

function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function parseCookies(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return Object.fromEntries(
    cookieHeader.split(';').filter(Boolean).map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}

export async function GET(request) {
  if (supabaseConfigured()) {
    const cookies = parseCookies(request);
    const token = cookies[COOKIE_NAME];
    if (!token) {
      return jsonResponse({ error: true, statusCode: 401, code: 'UNAUTHORIZED', message: 'Não autenticado' }, 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return jsonResponse({ error: true, statusCode: 401, code: 'UNAUTHORIZED', message: 'Sessão expirada. Faça login novamente.' }, 401);
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, role, created_at, tenant_id')
      .eq('id', payload.sub)
      .maybeSingle();

    if (error || !user) {
      return jsonResponse({ error: true, statusCode: 401, code: 'UNAUTHORIZED', message: 'Usuário não encontrado' }, 401);
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, slug')
      .eq('id', user.tenant_id)
      .single();

    return jsonResponse({
      user: { ...user, name: user.display_name },
      tenant: { name: tenant?.name || '', slug: tenant?.slug || '' },
    });
  }

  const result = await proxyToBackend(request, { path: '/api/auth/me' });
  if (result.body) return jsonResponse(result.body, result.status);

  return jsonResponse({ error: true, statusCode: 401, code: 'UNAUTHORIZED', message: 'Não autenticado' }, 401);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
