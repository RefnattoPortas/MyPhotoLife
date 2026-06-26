import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const id = request.nextUrl.searchParams.get('id');

    if (!slug || !id) {
      return NextResponse.json({ message: 'slug and id are required' }, { status: 400 });
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .select('id, theme_config')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json({ message: 'Portfolio not found' }, { status: 404 });
    }

    const { data: album, error: albumErr } = await supabaseAdmin
      .from('albums')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .eq('is_public', true)
      .single();

    if (albumErr || !album) {
      return NextResponse.json({ message: 'Album not found' }, { status: 404 });
    }

    const { data: media } = await supabaseAdmin
      .from('media_files')
      .select('*')
      .eq('album_id', id)
      .order('display_order', { ascending: true });

    return NextResponse.json({
      album,
      media: media || [],
      theme: tenant.theme_config,
    });

  } catch (error) {
    console.error('Album error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
