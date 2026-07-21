import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function PATCH(request, { params }) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const { id } = params;
    const body = await request.json().catch(() => ({}));

    const { data: existing } = await supabaseAdmin
      .from('media_files')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (!existing) {
      return jsonResponse({ message: 'Mídia não encontrada' }, 404);
    }

    const updates = {};
    if (body.album_id !== undefined) updates.album_id = body.album_id || null;
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.is_for_sale !== undefined) updates.is_for_sale = body.is_for_sale;
    if (body.price !== undefined) updates.price = parseFloat(body.price);

    if (!Object.keys(updates).length) {
      return jsonResponse({ message: 'Nenhum campo para atualizar.' }, 400);
    }

    const { data: media, error } = await supabaseAdmin
      .from('media_files')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return jsonResponse({ message: 'Erro ao atualizar mídia.' }, 500);
    }

    return jsonResponse({ media, message: 'Mídia atualizada com sucesso!' });
  } catch {
    return jsonResponse({ message: 'Erro ao atualizar mídia.' }, 500);
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

    const { data: media } = await supabaseAdmin
      .from('media_files')
      .select('id, original_path, size_bytes, tenant_id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (!media) {
      return jsonResponse({ message: 'Mídia não encontrada' }, 404);
    }

    if (media.original_path?.includes(user.tenant_id)) {
      const storagePath = media.original_path.split('/public/').pop() || media.original_path;
      await supabaseAdmin.storage.from('media').remove([storagePath]);
    }

    const { error } = await supabaseAdmin
      .from('media_files')
      .delete()
      .eq('id', id);

    if (error) {
      return jsonResponse({ message: 'Erro ao excluir mídia.' }, 500);
    }

    if (media.size_bytes) {
      const { data: usage } = await supabaseAdmin
        .from('tenants')
        .select('storage_used')
        .eq('id', user.tenant_id)
        .maybeSingle();

      const newUsed = Math.max(0, (usage?.storage_used || 0) - media.size_bytes);
      await supabaseAdmin
        .from('tenants')
        .update({ storage_used: newUsed, updated_at: new Date().toISOString() })
        .eq('id', user.tenant_id);
    }

    return jsonResponse({ message: 'Mídia excluída com sucesso!' });
  } catch {
    return jsonResponse({ message: 'Erro ao excluir mídia.' }, 500);
  }
}
