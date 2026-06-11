import { getPool } from '../config/database.js';
import { notFound } from '../utils/errors.js';

export default async function portfolioRoutes(fastify) {
  // GET /:slug — Portfólio público do fotógrafo
  fastify.get('/:slug', async (request, reply) => {
    const { slug } = request.params;
    const pool = getPool();

    const [tenants] = await pool.execute(
      'SELECT id, name, slug, bio, theme_config FROM tenants WHERE slug = ? AND is_active = TRUE LIMIT 1',
      [slug],
    );
    if (tenants.length === 0) throw notFound('Photographer not found');

    const tenant = tenants[0];

    const [albums] = await pool.execute(
      `SELECT a.id, a.title, a.description, a.price, a.is_for_sale,
              mf.thumbnail_path AS cover_thumbnail,
              (SELECT COUNT(*) FROM media_files m WHERE m.album_id = a.id) AS media_count
       FROM albums a
       LEFT JOIN media_files mf ON mf.id = a.cover_media_id
       WHERE a.tenant_id = ? AND a.is_public = TRUE
       ORDER BY a.display_order ASC, a.created_at DESC`,
      [tenant.id],
    );

    const [saleMedia] = await pool.execute(
      `SELECT id, filename, thumbnail_path, optimized_path, width, height, price, album_id
       FROM media_files
       WHERE tenant_id = ? AND is_for_sale = TRUE AND album_id IS NULL
       ORDER BY display_order ASC, created_at DESC`,
      [tenant.id],
    );

    return {
      photographer: {
        name: tenant.name,
        slug: tenant.slug,
        bio: tenant.bio,
        theme: tenant.theme_config,
      },
      albums,
      sale_media: saleMedia,
    };
  });

  // GET /:slug/albums/:id — Álbum público com fotos
  fastify.get('/:slug/albums/:id', async (request, reply) => {
    const { slug, id } = request.params;
    const pool = getPool();

    const [tenants] = await pool.execute(
      'SELECT id, name FROM tenants WHERE slug = ? AND is_active = TRUE LIMIT 1',
      [slug],
    );
    if (tenants.length === 0) throw notFound('Photographer not found');

    const [albums] = await pool.execute(
      'SELECT * FROM albums WHERE id = ? AND tenant_id = ? AND is_public = TRUE LIMIT 1',
      [id, tenants[0].id],
    );
    if (albums.length === 0) throw notFound('Album not found');

    const [media] = await pool.execute(
      `SELECT id, filename, optimized_path, thumbnail_path, width, height,
              is_for_sale, price, display_order
       FROM media_files
       WHERE album_id = ?
       ORDER BY display_order ASC, created_at ASC`,
      [id],
    );

    return { album: albums[0], media };
  });
}
