import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function GET(_, { params }) {
  if (!supabaseConfigured()) {
    return jsonResponse({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Serviço temporariamente indisponível.' }, 503);
  }

  try {
    const { slug, id } = params;

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!tenant) {
      return jsonResponse({ error: true, code: 'NOT_FOUND', message: 'Portfólio não encontrado' }, 404);
    }

    const { data: album, error: albumError } = await supabaseAdmin
      .from('albums')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .eq('is_public', true)
      .maybeSingle();

    if (albumError || !album) {
      return jsonResponse({ error: true, code: 'NOT_FOUND', message: 'Álbum não encontrado' }, 404);
    }

    const { data: media, error: mediaError } = await supabaseAdmin
      .from('media_files')
      .select('*')
      .eq('album_id', album.id)
      .order('display_order', { ascending: true });

    if (mediaError) {
      return jsonResponse({ error: true, code: 'FETCH_ERROR', message: 'Erro ao carregar mídias' }, 500);
    }

    return jsonResponse({
      album: {
        ...album,
        media_count: media?.length || 0,
      },
      media: media || [],
    });
  } catch {
    return jsonResponse({ error: true, code: 'UNEXPECTED', message: 'Não foi possível carregar o álbum' }, 500);
  }
}
