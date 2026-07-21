import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function GET(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.', orders: [] }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ['pending', 'paid', 'expired', 'cancelled', 'refunded'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      return jsonResponse({ message: 'Erro ao carregar pedidos.', orders: [] }, 500);
    }

    const { count: total } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    const enriched = await Promise.all((orders || []).map(async (order) => {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      return { ...order, items: items || [] };
    }));

    return jsonResponse({
      orders: enriched,
      pagination: {
        total: total?.count ?? enriched.length,
        page,
        limit,
        pages: Math.ceil((total?.count ?? enriched.length) / limit),
      },
    });
  } catch {
    return jsonResponse({ message: 'Erro ao carregar pedidos.', orders: [] }, 500);
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
    const { customer_name, customer_email, customer_phone, items } = body;

    if (!customer_name || !customer_email || !items?.length) {
      return jsonResponse({ message: 'Nome, email do cliente e itens são obrigatórios.' }, 400);
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (item.item_type === 'album') {
        const { data: album } = await supabaseAdmin
          .from('albums')
          .select('id, title, price')
          .eq('id', item.album_id)
          .eq('tenant_id', user.tenant_id)
          .maybeSingle();

        if (!album) continue;

        const qty = item.quantity || 1;
        const unitPrice = parseFloat(album.price || 0);
        const totalPrice = unitPrice * qty;
        totalAmount += totalPrice;

        orderItems.push({
          item_type: 'album',
          album_id: album.id,
          title: album.title,
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
        });
      } else if (item.item_type === 'photo' && item.media_id) {
        const { data: media } = await supabaseAdmin
          .from('media_files')
          .select('id, filename, price, album_id')
          .eq('id', item.media_id)
          .eq('tenant_id', user.tenant_id)
          .maybeSingle();

        if (!media) continue;

        const qty = item.quantity || 1;
        const unitPrice = parseFloat(item.price || media.price || 0);
        const totalPrice = unitPrice * qty;
        totalAmount += totalPrice;

        orderItems.push({
          item_type: 'photo',
          media_file_id: media.id,
          album_id: media.album_id,
          title: media.filename,
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
        });
      }
    }

    if (!orderItems.length || totalAmount <= 0) {
      return jsonResponse({ message: 'Nenhum item válido para criar o pedido.' }, 400);
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        tenant_id: user.tenant_id,
        customer_name: customer_name.trim(),
        customer_email: customer_email.trim().toLowerCase(),
        customer_phone: customer_phone?.trim() || null,
        total_amount: totalAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return jsonResponse({ message: 'Erro ao criar pedido.' }, 500);
    }

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems.map(i => ({ ...i, order_id: order.id })));

    if (itemsError) {
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return jsonResponse({ message: 'Erro ao criar itens do pedido.' }, 500);
    }

    return jsonResponse({ order: { ...order, items: orderItems }, message: 'Pedido criado com sucesso!' }, 201);
  } catch {
    return jsonResponse({ message: 'Erro ao criar pedido.' }, 500);
  }
}
