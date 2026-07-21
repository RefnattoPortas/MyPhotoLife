import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyToken, errorResponse, COOKIE_NAME } from '@/lib/auth-native';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').filter(Boolean).map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );

    const token = cookies[COOKIE_NAME];
    if (!token) {
      return Response.json({ error: true, statusCode: 401, code: 'UNAUTHORIZED', message: 'Não autenticado' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return Response.json({ error: true, statusCode: 401, code: 'UNAUTHORIZED', message: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      const err = errorResponse('BACKEND_UNAVAILABLE');
      return Response.json(err.body, { status: err.status });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, role, created_at, tenant_id')
      .eq('id', payload.sub)
      .maybeSingle();

    if (error || !user) {
      return Response.json({ error: true, statusCode: 401, code: 'UNAUTHORIZED', message: 'Usuário não encontrado' }, { status: 401 });
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, slug')
      .eq('id', user.tenant_id)
      .single();

    return Response.json({
      user: { ...user, name: user.display_name },
      tenant: { name: tenant?.name || '', slug: tenant?.slug || '' },
    });
  } catch {
    const err = errorResponse('UNEXPECTED');
    return Response.json(err.body, { status: err.status });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
