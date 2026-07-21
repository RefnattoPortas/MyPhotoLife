import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateSlug } from '@/lib/auth-native';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return Response.json({ available: false, error: 'Slug é obrigatório.' }, { status: 400 });
  }

  const slugError = validateSlug(slug);
  if (slugError) {
    return Response.json({ available: false, error: slugError });
  }

  if (!supabaseAdmin) {
    return Response.json({ available: false, error: 'Serviço temporariamente indisponível.' });
  }

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
    return Response.json({ available: false, error: 'Serviço temporariamente indisponível.' });
  }

  return Response.json({ available: !data || data.length === 0, slug: normalizedSlug });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
