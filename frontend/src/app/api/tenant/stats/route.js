import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-long-random-string';

function getTenantId(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    return payload.tenantId;
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { count: albumCount, error: albumErr } = await supabaseAdmin
      .from('albums')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (albumErr) console.error(albumErr);

    const { count: mediaCount, error: mediaErr } = await supabaseAdmin
      .from('media_files')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (mediaErr) console.error(mediaErr);

    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid');

    const orderCount = orders?.length || 0;
    const revenue = orders?.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) || 0;

    if (ordersErr) console.error(ordersErr);

    return NextResponse.json({
      stats: {
        albumCount: albumCount || 0,
        mediaCount: mediaCount || 0,
        orderCount,
        revenue,
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
