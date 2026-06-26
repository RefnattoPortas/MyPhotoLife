import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ message: 'slug is required' }, { status: 400 });
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, bio, headline, theme_config, is_active, instagram, twitter, phone, whatsapp')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json({ message: 'Portfolio not found' }, { status: 404 });
    }

    const { data: albums } = await supabaseAdmin
      .from('albums')
      .select('id, title, description, price, is_for_sale, display_order, cover_media_id')
      .eq('tenant_id', tenant.id)
      .eq('is_public', true)
      .order('display_order', { ascending: true });

    const albumIds = (albums || []).map((a) => a.id);
    let countMap = {};
    let coverMap = {};

    if (albumIds.length > 0) {
      const { data: counts } = await supabaseAdmin
        .from('media_files')
        .select('album_id')
        .in('album_id', albumIds);

      if (counts) {
        for (const m of counts) {
          countMap[m.album_id] = (countMap[m.album_id] || 0) + 1;
        }
      }

      const coverIds = albums.filter((a) => a.cover_media_id).map((a) => a.cover_media_id);
      if (coverIds.length > 0) {
        const { data: covers } = await supabaseAdmin
          .from('media_files')
          .select('id, thumbnail_path')
          .in('id', coverIds);
        if (covers) {
          for (const m of covers) {
            coverMap[m.id] = m.thumbnail_path;
          }
        }
      }
    }

    const { data: schedule } = await supabaseAdmin
      .from('schedule')
      .select('id, title, event_date, location, status')
      .eq('tenant_id', tenant.id)
      .order('event_date', { ascending: true });

    return NextResponse.json({
      photographer: {
        name: tenant.name,
        slug: tenant.slug,
        bio: tenant.bio,
        headline: tenant.headline,
        theme: tenant.theme_config,
        instagram: tenant.instagram,
        twitter: tenant.twitter,
        phone: tenant.phone,
        whatsapp: tenant.whatsapp,
      },
      albums: (albums || []).map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        price: a.price,
        is_for_sale: a.is_for_sale,
        cover_thumbnail: coverMap[a.cover_media_id] || null,
        media_count: countMap[a.id] || 0,
      })),
      schedule: schedule || [],
      sale_media: [],
    });

  } catch (error) {
    console.error('Portfolio error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
