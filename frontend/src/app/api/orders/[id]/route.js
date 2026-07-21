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

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (error || !order) {
      return jsonResponse({ message: 'Pedido não encontrado' }, 404);
    }

    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    return jsonResponse({ order: { ...order, items: items || [] } });
  } catch {
    return jsonResponse({ message: 'Erro ao carregar pedido' }, 500);
  }
}
