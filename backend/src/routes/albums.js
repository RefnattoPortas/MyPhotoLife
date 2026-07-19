import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';
import { deleteObject } from '../services/storage.js';

export default async function albumRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

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

  fastify.get('/', { preHandler: [fastify.requireTenant] }, async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      `SELECT a.*,
        (SELECT COUNT(*) FROM media_files m WHERE m.album_id = a.id AND m.deleted_at IS NULL) AS media_count,
        (SELECT mf.thumbnail_path FROM media_files mf WHERE mf.id = a.cover_media_id) AS cover_thumbnail
       FROM albums a
       WHERE a.tenant_id = ? AND a.deleted_at IS NULL
       ORDER BY a.display_order ASC, a.created_at DESC`,
      [tenantId],
    );

    return { albums: rows };
  });

  fastify.get('/:id', { preHandler: [fastify.requireTenant] }, async (request) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT * FROM albums WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, tenantId],
    );

    if (rows.length === 0) throw notFound('Album not found');

    const [media] = await pool.execute(
      `SELECT id, filename, thumbnail_path, optimized_path, width, height,
              is_for_sale, price, display_order, size_bytes, mime_type, created_at
       FROM media_files
       WHERE album_id = ? AND deleted_at IS NULL
       ORDER BY display_order ASC, created_at ASC`,
      [id],
    );

    return { album: rows[0], media };
  });

  fastify.put('/:id', { preHandler: [fastify.requireTenant] }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const { title, description, is_public, is_for_sale, price, display_order, cover_media_id } = request.body || {};
    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM albums WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
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

  fastify.delete('/:id', { preHandler: [fastify.requireTenant] }, async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const userId = request.user?.id || null;
    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM albums WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, tenantId],
    );
    if (existing.length === 0) throw notFound('Album not found');

    const [activeOrders] = await pool.execute(
      `SELECT 1 FROM order_items oi
       JOIN media_files m ON m.id = oi.media_file_id
       JOIN orders o ON o.id = oi.order_id
       WHERE m.album_id = ? AND o.status IN ('pending','paid')
       LIMIT 1`,
      [id],
    );
    if (activeOrders.length > 0) {
      throw conflict('Este álbum possui pedidos em andamento. Não é possível excluí-lo.');
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [media] = await conn.execute(
        'SELECT id, original_path, optimized_path, thumbnail_path FROM media_files WHERE album_id = ? AND tenant_id = ? AND deleted_at IS NULL',
        [id, tenantId],
      );

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      for (const m of media) {
        await conn.execute(
          'UPDATE media_files SET deleted_at = ?, deleted_by = ? WHERE id = ?',
          [now, userId, m.id],
        );
        await Promise.allSettled([
          deleteObject(m.original_path, true).catch(() => {}),
          deleteObject(m.optimized_path, false).catch(() => {}),
          deleteObject(m.thumbnail_path, false).catch(() => {}),
        ]);
      }

      await conn.execute(
        'UPDATE albums SET deleted_at = ?, deleted_by = ? WHERE id = ? AND tenant_id = ?',
        [now, userId, id, tenantId],
      );

      const auditId = uuidv4();
      await conn.execute(
        `INSERT INTO audit_log (id, tenant_id, user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, ?, 'delete', 'album', ?, ?)`,
        [auditId, tenantId, userId, id, JSON.stringify({ mediaCount: media.length })],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    reply.status(200).send({ id, deleted: true });
  });
}
