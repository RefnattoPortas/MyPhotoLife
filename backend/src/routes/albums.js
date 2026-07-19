import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { notFound, badRequest } from '../utils/errors.js';

export default async function albumRoutes(fastify) {
  // Prefixo: /api/albums
  // Todas as rotas requerem autenticação + tenant
  fastify.addHook('preHandler', fastify.authenticate);

  // POST / — Criar álbum
  fastify.post('/', { preHandler: [fastify.requireTenant] }, async (request, reply) => {
    const { title, description, is_public, is_for_sale, price, display_order } = request.body || {};
    const tenantId = request.tenantId;

    if (!title) throw badRequest('title is required');

    const id = uuidv4();
    const pool = getPool();

    await pool.execute(
      `INSERT INTO albums (id, tenant_id, title, description, is_public, is_for_sale, price, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, title, description || null, is_public ?? true, is_for_sale ?? false, price ?? 0, display_order ?? 0],
    );

    reply.status(201).send({ id, title });
  });

  // GET / — Listar álbuns do tenant
  fastify.get('/', { preHandler: [fastify.requireTenant] }, async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      `SELECT a.*, 
        (SELECT COUNT(*) FROM media_files m WHERE m.album_id = a.id) AS media_count,
        (SELECT mf.thumbnail_path FROM media_files mf WHERE mf.id = a.cover_media_id) AS cover_thumbnail
       FROM albums a
       WHERE a.tenant_id = ?
       ORDER BY a.display_order ASC, a.created_at DESC`,
      [tenantId],
    );

    return { albums: rows };
  });

  // GET /:id — Obter álbum específico
  fastify.get('/:id', { preHandler: [fastify.requireTenant] }, async (request) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT * FROM albums WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );

    if (rows.length === 0) throw notFound('Album not found');

    const [media] = await pool.execute(
      `SELECT id, filename, thumbnail_path, optimized_path, width, height,
              is_for_sale, price, display_order, size_bytes, mime_type, created_at
       FROM media_files
       WHERE album_id = ?
       ORDER BY display_order ASC, created_at ASC`,
      [id],
    );

    return { album: rows[0], media };
  });

  // PUT /:id — Atualizar álbum
  fastify.put('/:id', { preHandler: [fastify.requireTenant] }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const { title, description, is_public, is_for_sale, price, display_order, cover_media_id } = request.body || {};
    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM albums WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );
    if (existing.length === 0) throw notFound('Album not found');

    await pool.execute(
      `UPDATE albums SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        is_public = COALESCE(?, is_public),
        is_for_sale = COALESCE(?, is_for_sale),
        price = COALESCE(?, price),
        display_order = COALESCE(?, display_order),
        cover_media_id = COALESCE(?, cover_media_id)
       WHERE id = ? AND tenant_id = ?`,
      [title, description ?? null, is_public, is_for_sale, price, display_order, cover_media_id ?? null, id, tenantId],
    );

    reply.status(200).send({ id, updated: true });
  });

  // DELETE /:id — Remover álbum
  fastify.delete('/:id', { preHandler: [fastify.requireTenant] }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM albums WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );
    if (existing.length === 0) throw notFound('Album not found');

    await pool.execute('DELETE FROM albums WHERE id = ? AND tenant_id = ?', [id, tenantId]);

    reply.status(200).send({ id, deleted: true });
  });
}
