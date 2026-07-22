import { supabaseConfigured, jsonResponse } from '@/lib/api-auth';

function safeLog({ operation, table, rows, tenantRef, code, detail }) {
  console.log(JSON.stringify({
    severity: code >= 500 ? 'error' : 'warn',
    operation,
    table,
    rows,
    tenantRef,
    code,
    ...(detail ? { detail } : {}),
  }));
}

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Serviço temporariamente indisponível.' }, 503);
    }

    const encodedSlug = encodeURIComponent(slug.toLowerCase());
    const restUrl = `${supabaseUrl}/rest/v1/tenants?select=*&slug=eq.${encodedSlug}&is_active=eq.true`;
    const restRes = await fetch(restUrl, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: 'no-store',
    });
    if (!restRes.ok) {
      const errText = await restRes.text().catch(() => 'unknown');
      safeLog({ operation: 'portfolio_get', table: 'tenants', rows: 0, code: restRes.status, detail: errText });
      return jsonResponse({ error: true, code: 'DB_ERROR', message: 'Erro ao consultar portfólio' }, 500);
    }
    const tenants = await restRes.json();
    const tenant = tenants?.[0] || null;

    if (!tenant) {
      safeLog({ operation: 'portfolio_get', table: 'tenants', rows: 0, code: 404, detail: JSON.stringify({ slug }) });
      return jsonResponse({ error: true, code: 'NOT_FOUND', message: 'Portfólio não encontrado' }, 404);
    }

    safeLog({ operation: 'portfolio_get', table: 'tenants', rows: 1, tenantRef: tenant.id?.slice(0, 8), code: 200, detail: JSON.stringify({ slug, is_active: tenant.is_active, updated_at: tenant.updated_at }) });

    const photographer = buildPublicPhotographer(tenant);

    // Albums
    const albumUrl = `${supabaseUrl}/rest/v1/albums?select=id,title,description,cover_media_id,price,is_public,is_for_sale,display_order,created_at&tenant_id=eq.${encodeURIComponent(tenant.id)}&is_public=eq.true&order=display_order.asc,created_at.desc`;
    const albumsRes = await fetch(albumUrl, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: 'no-store',
    });
    if (!albumsRes.ok) {
      return jsonResponse({ error: true, code: 'FETCH_ERROR', message: 'Erro ao carregar álbuns' }, 500);
    }
    const albums = await albumsRes.json();
    if (!Array.isArray(albums)) {
      return jsonResponse({ error: true, code: 'FETCH_ERROR', message: 'Erro ao carregar álbuns' }, 500);
    }

    const albumsWithMedia = await Promise.all((albums).map(async (album) => {
      const countUrl = `${supabaseUrl}/rest/v1/media_files?select=id&album_id=eq.${encodeURIComponent(album.id)}&limit=0`;
      const countRes = await fetch(countUrl, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'count=exact' },
        cache: 'no-store',
      });
      const count = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);

      let coverThumbnail = null;
      if (album.cover_media_id) {
        const coverUrl = `${supabaseUrl}/rest/v1/media_files?select=thumbnail_path&id=eq.${encodeURIComponent(album.cover_media_id)}&limit=1`;
        const coverRes = await fetch(coverUrl, {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: 'no-store',
        });
        const coverMedia = await coverRes.json();
        coverThumbnail = coverMedia?.[0]?.thumbnail_path || null;
      } else {
        const firstUrl = `${supabaseUrl}/rest/v1/media_files?select=thumbnail_path&album_id=eq.${encodeURIComponent(album.id)}&order=display_order.asc&limit=1`;
        const firstRes = await fetch(firstUrl, {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: 'no-store',
        });
        const firstMedia = await firstRes.json();
        coverThumbnail = firstMedia?.[0]?.thumbnail_path || null;
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
      const schedUrl = `${supabaseUrl}/rest/v1/schedule?select=id,title,event_date,location,status&tenant_id=eq.${encodeURIComponent(tenant.id)}&event_date=gte.${new Date().toISOString()}&order=event_date.asc&limit=50`;
      const schedRes = await fetch(schedUrl, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
      });
      schedule = await schedRes.json();
      if (!Array.isArray(schedule)) schedule = [];
    } catch {
      schedule = [];
    }

    return jsonResponse({
      photographer,
      albums: albumsWithMedia,
      schedule,
      _debug: { updated_at: tenant.updated_at, bg: tenant.theme_config?.bg_color },
    });
  } catch {
    return jsonResponse({ error: true, code: 'UNEXPECTED', message: 'Não foi possível carregar o portfólio' }, 500);
  }
}
