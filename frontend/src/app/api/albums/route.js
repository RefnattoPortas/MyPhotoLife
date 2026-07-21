import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function GET(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.', albums: [] }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const { data: albums, error } = await supabaseAdmin
      .from('albums')
      .select('id, title, description, cover_media_id, price, is_public, is_for_sale, display_order, created_at, updated_at')
      .eq('tenant_id', user.tenant_id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return jsonResponse({ message: 'Erro ao carregar álbuns', albums: [] }, 500);
    }

    const enriched = await Promise.all((albums || []).map(async (album) => {
      const { count } = await supabaseAdmin
        .from('media_files')
        .select('id', { count: 'exact', head: true })
        .eq('album_id', album.id);

      let cover = null;
      if (album.cover_media_id) {
        const { data: m } = await supabaseAdmin
          .from('media_files')
          .select('thumbnail_path')
          .eq('id', album.cover_media_id)
          .maybeSingle();
        cover = m?.thumbnail_path || null;
      }

      return { ...album, media_count: count || 0, cover_thumbnail: cover };
    }));

    return jsonResponse({ albums: enriched });
  } catch {
    return jsonResponse({ message: 'Erro ao carregar álbuns', albums: [] }, 500);
  }
}

export async function POST(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const { title, description, price, is_public, is_for_sale } = body;

    if (!title || !title.trim()) {
      return jsonResponse({ message: 'Título é obrigatório.' }, 400);
    }

    const { data: maxOrder } = await supabaseAdmin
      .from('albums')
      .select('display_order')
      .eq('tenant_id', user.tenant_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: album, error } = await supabaseAdmin
      .from('albums')
      .insert({
        tenant_id: user.tenant_id,
        title: title.trim(),
        description: description?.trim() || null,
        price: price != null ? parseFloat(price) : 0,
        is_public: is_public !== false,
        is_for_sale: !!is_for_sale,
        display_order: (maxOrder?.display_order ?? -1) + 1,
      })
      .select()
      .single();

    if (error) {
      return jsonResponse({ message: 'Erro ao criar álbum.' }, 500);
    }

    return jsonResponse({ album, message: 'Álbum criado com sucesso!' }, 201);
  } catch {
    return jsonResponse({ message: 'Erro ao criar álbum.' }, 500);
  }
}
