import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';
import {
  normalizeEmail,
  signToken,
  setCookieHeader,
  errorResponse,
} from '@/lib/auth-native';

export async function POST(request) {
  try {
    const { email, password } = await request.json().catch(() => ({}));

    if (!email || !password) {
      const err = errorResponse('MISSING_FIELDS');
      return Response.json(err.body, { status: err.status });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!supabaseAdmin) {
      const err = errorResponse('BACKEND_UNAVAILABLE');
      return Response.json(err.body, { status: err.status });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, display_name, role, tenant_id')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      const err = errorResponse('BACKEND_UNAVAILABLE');
      return Response.json(err.body, { status: err.status });
    }

    if (!user) {
      const err = errorResponse('INVALID_CREDENTIALS');
      return Response.json(err.body, { status: err.status });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = errorResponse('INVALID_CREDENTIALS');
      return Response.json(err.body, { status: err.status });
    }

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, is_active')
      .eq('id', user.tenant_id)
      .single();

    if (tenantError || !tenant) {
      const err = errorResponse('UNEXPECTED');
      return Response.json(err.body, { status: err.status });
    }

    const token = signToken({
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    });

    return new Response(JSON.stringify({
      token,
      csrfToken: token,
      user: { id: user.id, email: user.email, name: user.display_name, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    }), {
      status: 200,
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
