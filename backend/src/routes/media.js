import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { uploadOriginal, uploadOptimized } from '../services/storage.js';
import { processImage } from '../services/image.js';
import { notFound, badRequest } from '../utils/errors.js';
import { extname } from 'path';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

export default async function mediaRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireTenant);

  // POST /upload — Upload de arquivo com compressão automática
  fastify.post('/upload', async (request, reply) => {
    const tenantId = request.tenantId;
    const albumId = request.query.album_id || null;

    const data = await request.file();
    if (!data) throw badRequest('File is required');

    const ext = extname(data.filename).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      throw badRequest(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXT.join(', ')}`);
    }

    const buffer = await data.toBuffer();
    const mimeType = data.mimetype;

    if (!ALLOWED_MIME.includes(mimeType)) {
      throw badRequest(`Unsupported MIME type: ${mimeType}`);
    }

    // Processa imagem: otimizada + thumbnail
    const { optimizedBuffer, thumbnailBuffer, width, height, sizeBytes } = await processImage(buffer, mimeType);

    const fileId = uuidv4();
    const storageKey = `${tenantId}/${fileId}${ext}`;
    const optimizedKey = `${tenantId}/${fileId}_optimized.jpg`;
    const thumbKey = `${tenantId}/${fileId}_thumb.jpg`;

    // Upload paralelo: original no bucket privado, otimizada e thumb no bucket público
    await Promise.all([
      uploadOriginal(storageKey, buffer, mimeType),
      uploadOptimized(optimizedKey, optimizedBuffer, 'image/jpeg'),
      uploadOptimized(thumbKey, thumbnailBuffer, 'image/jpeg'),
    ]);

    const pool = getPool();
    await pool.execute(
      `INSERT INTO media_files
        (id, tenant_id, album_id, filename, original_path, optimized_path, thumbnail_path,
         mime_type, size_bytes, width, height, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fileId, tenantId, albumId, data.filename, storageKey, optimizedKey, thumbKey,
       mimeType, sizeBytes, width, height, 0],
    );

    reply.status(201).send({
      id: fileId,
      filename: data.filename,
      optimized_url: `/cdn/${optimizedKey}`,
      thumbnail_url: `/cdn/${thumbKey}`,
      width,
      height,
      size_bytes: sizeBytes,
    });
  });

  // DELETE /:id — Remover mídia
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT id FROM media_files WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );
    if (rows.length === 0) throw notFound('Media not found');

    await pool.execute('DELETE FROM media_files WHERE id = ? AND tenant_id = ?', [id, tenantId]);

    reply.status(200).send({ id, deleted: true });
  });

  // PATCH /:id — Atualizar metadados (preço, venda, ordem)
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const { is_for_sale, price, display_order, album_id } = request.body || {};
    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM media_files WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );
    if (existing.length === 0) throw notFound('Media not found');

    const updates = [];
    const params = [];

    if (is_for_sale !== undefined) { updates.push('is_for_sale = ?'); params.push(is_for_sale); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (display_order !== undefined) { updates.push('display_order = ?'); params.push(display_order); }
    if (album_id !== undefined) { updates.push('album_id = ?'); params.push(album_id); }

    if (updates.length > 0) {
      params.push(id, tenantId);
      await pool.execute(
        `UPDATE media_files SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
        params,
      );
    }

    reply.status(200).send({ id, updated: true });
  });
}
