import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function GET(request, { params }) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const { id } = params;

    const { data: album, error } = await supabaseAdmin
      .from('albums')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (error || !album) {
      return jsonResponse({ message: 'Álbum não encontrado' }, 404);
    }

    const { data: media, error: mediaError } = await supabaseAdmin
      .from('media_files')
      .select('*')
      .eq('album_id', album.id)
      .order('display_order', { ascending: true });

    if (mediaError) {
      return jsonResponse({ message: 'Erro ao carregar mídias' }, 500);
    }

    return jsonResponse({
      album: { ...album, media_count: media?.length || 0 },
      media: media || [],
    });
  } catch {
    return jsonResponse({ message: 'Erro ao carregar álbum' }, 500);
  }
}

export async function PUT(request, { params }) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const { id } = params;
    const body = await request.json().catch(() => ({}));

    const { data: existing } = await supabaseAdmin
      .from('albums')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (!existing) {
      return jsonResponse({ message: 'Álbum não encontrado' }, 404);
    }

    const updates = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.price !== undefined) updates.price = parseFloat(body.price);
    if (body.is_public !== undefined) updates.is_public = body.is_public;
    if (body.is_for_sale !== undefined) updates.is_for_sale = body.is_for_sale;
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.cover_media_id !== undefined) updates.cover_media_id = body.cover_media_id || null;

    if (!Object.keys(updates).length) {
      return jsonResponse({ message: 'Nenhum campo para atualizar.' }, 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data: album, error } = await supabaseAdmin
      .from('albums')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return jsonResponse({ message: 'Erro ao atualizar álbum.' }, 500);
    }

    return jsonResponse({ album, message: 'Álbum atualizado com sucesso!' });
  } catch {
    return jsonResponse({ message: 'Erro ao atualizar álbum.' }, 500);
  }
}

export async function DELETE(request, { params }) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const { id } = params;

    const { data: existing } = await supabaseAdmin
      .from('albums')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (!existing) {
      return jsonResponse({ message: 'Álbum não encontrado' }, 404);
    }

    const { error } = await supabaseAdmin
      .from('albums')
      .delete()
      .eq('id', id);

    if (error) {
      return jsonResponse({ message: 'Erro ao excluir álbum.' }, 500);
    }

    return jsonResponse({ message: 'Álbum excluído com sucesso!' });
  } catch {
    return jsonResponse({ message: 'Erro ao excluir álbum.' }, 500);
  }
}
