import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabaseConfigured, jsonResponse } from '@/lib/api-auth';

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

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, role')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .limit(1);

    const photographer = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      bio: tenant.bio || null,
      headline: tenant.headline || null,
      pix_key: tenant.pix_key || null,
      pix_key_type: tenant.pix_key_type || 'random',
      phone: tenant.phone || null,
      whatsapp: tenant.whatsapp || null,
      contact_email: tenant.contact_email || null,
      instagram: tenant.instagram || null,
      twitter: tenant.twitter || null,
      facebook: tenant.facebook || null,
      linkedin: tenant.linkedin || null,
      youtube: tenant.youtube || null,
      tiktok: tenant.tiktok || null,
      email_contact: !!tenant.contact_email,
      theme: tenant.theme_config || {
        bg_color: '#fafaf9',
        hover_color: '#1c1917',
        text_color: '#1c1917',
        font: 'Inter',
        cover_url: null,
        profile_photo_url: null,
      },
    };

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
          .select('thumbnail_path, optimized_path')
          .eq('id', album.cover_media_id)
          .maybeSingle();
        coverThumbnail = coverMedia?.thumbnail_path || coverMedia?.optimized_path || null;
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
        ...album,
        cover_thumbnail: coverThumbnail,
        media_count: count || 0,
      };
    }));

    let schedule = [];
    try {
      const { data: s } = await supabaseAdmin
        .from('schedule')
        .select('*')
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
  } catch (err) {
    return jsonResponse({ error: true, code: 'UNEXPECTED', message: 'Não foi possível carregar o portfólio' }, 500);
  }
}
