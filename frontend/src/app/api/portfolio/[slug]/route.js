import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseConfigured, jsonResponse } from '@/lib/api-auth';

function buildPublicPhotographer(tenant) {
  const p = {
    name: tenant.name,
    bio: tenant.bio || null,
    headline: tenant.headline || null,
  };

  if (tenant.instagram) p.instagram = tenant.instagram;
  if (tenant.twitter) p.twitter = tenant.twitter;
  if (tenant.facebook) p.facebook = tenant.facebook;
  if (tenant.linkedin) p.linkedin = tenant.linkedin;
  if (tenant.youtube) p.youtube = tenant.youtube;
  if (tenant.tiktok) p.tiktok = tenant.tiktok;

  if (tenant.phone) p.phone = tenant.phone;
  if (tenant.whatsapp) p.whatsapp = tenant.whatsapp;
  if (tenant.contact_email) p.contact_email = tenant.contact_email;

  p.theme = tenant.theme_config || {
    bg_color: '#fafaf9',
    hover_color: '#1c1917',
    text_color: '#1c1917',
    font: 'Inter',
    cover_url: null,
    profile_photo_url: null,
  };

  return p;
}

export async function GET(_, { params }) {
  if (!supabaseConfigured()) {
    return jsonResponse({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Serviço temporariamente indisponível.' }, 503);
  }

  try {
    const { slug } = params;

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('slug', slug.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!tenant) {
      return jsonResponse({ error: true, code: 'NOT_FOUND', message: 'Portfólio não encontrado' }, 404);
    }

    const photographer = buildPublicPhotographer(tenant);

    const { data: albums, error: albumsError } = await supabaseAdmin
      .from('albums')
      .select('id, title, description, cover_media_id, price, is_public, is_for_sale, display_order, created_at')
      .eq('tenant_id', tenant.id)
      .eq('is_public', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (albumsError) {
      return jsonResponse({ error: true, code: 'FETCH_ERROR', message: 'Erro ao carregar álbuns' }, 500);
    }

    const albumsWithMedia = await Promise.all((albums || []).map(async (album) => {
      const { count } = await supabaseAdmin
        .from('media_files')
        .select('id', { count: 'exact', head: true })
        .eq('album_id', album.id);

      let coverThumbnail = null;
      if (album.cover_media_id) {
        const { data: coverMedia } = await supabaseAdmin
          .from('media_files')
          .select('thumbnail_path')
          .eq('id', album.cover_media_id)
          .maybeSingle();
        coverThumbnail = coverMedia?.thumbnail_path || null;
      } else {
        const { data: firstMedia } = await supabaseAdmin
          .from('media_files')
          .select('thumbnail_path')
          .eq('album_id', album.id)
          .order('display_order', { ascending: true })
          .limit(1)
          .maybeSingle();
        coverThumbnail = firstMedia?.thumbnail_path || null;
      }

      return {
        id: album.id,
        title: album.title,
        description: album.description,
        price: album.price,
        is_public: album.is_public,
        is_for_sale: album.is_for_sale,
        display_order: album.display_order,
        created_at: album.created_at,
        cover_thumbnail: coverThumbnail,
        media_count: count || 0,
      };
    }));

    let schedule = [];
    try {
      const { data: s } = await supabaseAdmin
        .from('schedule')
        .select('id, title, event_date, location, status')
        .eq('tenant_id', tenant.id)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(50);
      schedule = s || [];
    } catch {
      schedule = [];
    }

    return jsonResponse({
      photographer,
      albums: albumsWithMedia,
      schedule,
    });
  } catch {
    return jsonResponse({ error: true, code: 'UNEXPECTED', message: 'Não foi possível carregar o portfólio' }, 500);
  }
}
