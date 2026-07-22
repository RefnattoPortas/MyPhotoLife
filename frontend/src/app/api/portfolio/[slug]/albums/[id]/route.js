import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseConfigured, jsonResponse } from '@/lib/api-auth';

function buildPublicMedia(mediaItem, isAlbumForSale) {
  const m = {
    id: mediaItem.id,
    filename: mediaItem.filename,
    mime_type: mediaItem.mime_type,
    display_order: mediaItem.display_order,
    created_at: mediaItem.created_at,
    size_bytes: mediaItem.size_bytes,
    width: mediaItem.width,
    height: mediaItem.height,
    is_for_sale: mediaItem.is_for_sale,
    price: mediaItem.price,
    blurhash: mediaItem.blurhash || null,
  };

  if (isAlbumForSale || mediaItem.is_for_sale) {
    m.thumbnail_path = mediaItem.thumbnail_path || null;
  } else {
    m.thumbnail_path = mediaItem.thumbnail_path || null;
    m.optimized_path = mediaItem.optimized_path || null;
  }

  return m;
}

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
      .select('id, title, description, price, is_public, is_for_sale, display_order, created_at')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .eq('is_public', true)
      .maybeSingle();

    if (albumError || !album) {
      return jsonResponse({ error: true, code: 'NOT_FOUND', message: 'Álbum não encontrado' }, 404);
    }

    const { data: media, error: mediaError } = await supabaseAdmin
      .from('media_files')
      .select('id, filename, mime_type, display_order, created_at, size_bytes, width, height, is_for_sale, price, blurhash, thumbnail_path, optimized_path')
      .eq('album_id', album.id)
      .order('display_order', { ascending: true });

    if (mediaError) {
      return jsonResponse({ error: true, code: 'FETCH_ERROR', message: 'Erro ao carregar mídias' }, 500);
    }

    const isPaid = album.is_for_sale && parseFloat(album.price) > 0;

    return jsonResponse({
      album: {
        ...album,
        media_count: media?.length || 0,
      },
      media: (media || []).map((m) => buildPublicMedia(m, isPaid)),
    });
  } catch {
    return jsonResponse({ error: true, code: 'UNEXPECTED', message: 'Não foi possível carregar o álbum' }, 500);
  }
}
