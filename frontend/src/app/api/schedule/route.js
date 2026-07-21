import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function GET(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.', schedule: [] }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const url = new URL(request.url);
    const future = url.searchParams.get('future') !== 'false';

    let query = supabaseAdmin
      .from('schedule')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('event_date', { ascending: true });

    if (future) {
      query = query.gte('event_date', new Date().toISOString().split('T')[0]);
    }

    const { data: schedule, error } = await query;

    if (error) {
      return jsonResponse({ message: 'Erro ao carregar agenda.', schedule: [] }, 500);
    }

    return jsonResponse({ schedule: schedule || [] });
  } catch {
    return jsonResponse({ message: 'Erro ao carregar agenda.', schedule: [] }, 500);
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
    const { title, event_date, location, status } = body;

    if (!title || !title.trim()) {
      return jsonResponse({ message: 'Título é obrigatório.' }, 400);
    }

    if (!event_date) {
      return jsonResponse({ message: 'Data do evento é obrigatória.' }, 400);
    }

    const { data: event, error } = await supabaseAdmin
      .from('schedule')
      .insert({
        tenant_id: user.tenant_id,
        title: title.trim(),
        event_date,
        location: location?.trim() || null,
        status: status || 'Agenda Aberta',
      })
      .select()
      .single();

    if (error) {
      return jsonResponse({ message: 'Erro ao criar evento.' }, 500);
    }

    return jsonResponse({ schedule: event, message: 'Evento criado com sucesso!' }, 201);
  } catch {
    return jsonResponse({ message: 'Erro ao criar evento.' }, 500);
  }
}
