import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthUser, supabaseConfigured, jsonResponse } from '@/lib/api-auth';

export async function GET(request) {
  if (!supabaseConfigured()) {
    return jsonResponse({ message: 'Serviço temporariamente indisponível.' }, 503);
  }

  const user = await getAuthUser(request);
  if (!user) return jsonResponse({ message: 'Não autorizado' }, 401);

  try {
    const tenantId = user.tenant_id;

    const { count: totalAlbums } = await supabaseAdmin
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: totalMedia } = await supabaseAdmin
      .from('media_files')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: totalOrders } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: pendingOrders } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    const { count: paidOrders } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'paid');

    const { data: revenueData } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid');

    const totalRevenue = (revenueData || []).reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    const { count: publicAlbums } = await supabaseAdmin
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_public', true);

    const { data: storageData } = await supabaseAdmin
      .from('tenants')
      .select('storage_used, storage_quota')
      .eq('id', tenantId)
      .maybeSingle();

    return jsonResponse({
      stats: {
        total_albums: totalAlbums || 0,
        public_albums: publicAlbums || 0,
        total_media: totalMedia || 0,
        total_orders: totalOrders || 0,
        pending_orders: pendingOrders || 0,
        paid_orders: paidOrders || 0,
        total_revenue: totalRevenue,
        storage_used: storageData?.storage_used || 0,
        storage_quota: storageData?.storage_quota || 1073741824,
      },
    });
  } catch {
    return jsonResponse({ message: 'Erro ao carregar estatísticas' }, 500);
  }
}
