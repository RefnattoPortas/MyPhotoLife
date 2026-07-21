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
      .from('schedule')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (!existing) {
      return jsonResponse({ message: 'Evento não encontrado' }, 404);
    }

    const updates = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.event_date !== undefined) updates.event_date = body.event_date;
    if (body.location !== undefined) updates.location = body.location?.trim() || null;
    if (body.status !== undefined) updates.status = body.status;
    updates.updated_at = new Date().toISOString();

    if (!Object.keys(updates).length) {
      return jsonResponse({ message: 'Nenhum campo para atualizar.' }, 400);
    }

    const { data: event, error } = await supabaseAdmin
      .from('schedule')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return jsonResponse({ message: 'Erro ao atualizar evento.' }, 500);
    }

    return jsonResponse({ schedule: event, message: 'Evento atualizado com sucesso!' });
  } catch {
    return jsonResponse({ message: 'Erro ao atualizar evento.' }, 500);
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
      .from('schedule')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (!existing) {
      return jsonResponse({ message: 'Evento não encontrado' }, 404);
    }

    const { error } = await supabaseAdmin
      .from('schedule')
      .delete()
      .eq('id', id);

    if (error) {
      return jsonResponse({ message: 'Erro ao excluir evento.' }, 500);
    }

    return jsonResponse({ message: 'Evento excluído com sucesso!' });
  } catch {
    return jsonResponse({ message: 'Erro ao excluir evento.' }, 500);
  }
}
