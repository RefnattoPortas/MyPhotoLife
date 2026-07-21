import { proxyToBackend, jsonResponse } from '@/lib/api-proxy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateSlug } from '@/lib/auth-native';

function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return jsonResponse({ available: false, error: 'Slug é obrigatório.' }, 400);
  }

  const slugError = validateSlug(slug);
  if (slugError) {
    return jsonResponse({ available: false, error: slugError });
  }

  if (supabaseConfigured()) {
    const normalizedSlug = slug.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', normalizedSlug)
      .limit(1);

    if (error) {
      return jsonResponse({ available: false, error: 'Serviço temporariamente indisponível.' });
    }

    return jsonResponse({ available: !data || data.length === 0, slug: normalizedSlug });
  }

  const result = await proxyToBackend(request, { path: `/api/auth/slug-check?slug=${encodeURIComponent(slug)}` });
  if (result.body) return jsonResponse(result.body, result.status);

  return jsonResponse({ available: false, error: 'Serviço temporariamente indisponível.' }, 503);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
