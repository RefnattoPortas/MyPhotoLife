import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyToken, COOKIE_NAME } from '@/lib/auth-native';

function parseCookies(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return Object.fromEntries(
    cookieHeader.split(';').filter(Boolean).map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}

export async function getAuthUser(request) {
  const cookies = parseCookies(request);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, display_name, role, tenant_id')
    .eq('id', payload.sub)
    .maybeSingle();

  return user || null;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
