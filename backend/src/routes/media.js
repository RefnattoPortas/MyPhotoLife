import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { uploadOriginal, uploadOptimized, deleteObject } from '../services/storage.js';
import { processImage } from '../services/image.js';
import { notFound, badRequest } from '../utils/errors.js';
import { extname } from 'path';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const MAGIC_BYTES = {
  jpeg: [[0xFF, 0xD8, 0xFF]],
  png: [[0x89, 0x50, 0x4E, 0x47]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
};

function detectMimeFromBuffer(buffer) {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (sig.every((byte, i) => buffer[i] === byte)) {
        return `image/${mime}`;
      }
    }
  }
  return null;
}

function sanitizeFilename(filename) {
  const ext = extname(filename).toLowerCase();
  const name = filename
    .replace(ext, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 64);
  return `${name}${ext}`;
}

export default async function mediaRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireTenant);

  fastify.post('/upload', async (request, reply) => {
    const tenantId = request.tenantId;
    const albumId = request.query.album_id || null;

    if (albumId) {
      const pool = getPool();
      const [album] = await pool.execute(
        'SELECT id FROM albums WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
        [albumId, tenantId],
      );
      if (album.length === 0) throw notFound('Album not found or does not belong to you');
    }

    const data = await request.file().catch(() => null);
    if (!data) throw badRequest('File is required');

    const buffer = await data.toBuffer();
    const result = await doUpload(buffer, data.filename, data.mimetype, tenantId, albumId);
    reply.status(201).send({
      id: result.id,
      filename: result.filename,
      optimized_url: result.optimized_url,
      thumbnail_url: result.thumbnail_url,
      width: result.width,
      height: result.height,
      size_bytes: result.size_bytes,
    });
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const userId = request.user?.id || null;
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT id, original_path, optimized_path, thumbnail_path, album_id FROM media_files WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, tenantId],
    );
    if (rows.length === 0) throw notFound('Media not found');

    const media = rows[0];

    const [activeOrders] = await pool.execute(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.media_file_id = ? AND o.status IN ('pending','paid')
       LIMIT 1`,
      [id],
    );
    if (activeOrders.length > 0) {
      throw conflict('Esta foto possui pedidos em andamento. Não é possível excluí-la.');
    }

    const conn = await pool.getConnection();
    const deletionErrors = [];

    try {
      await conn.beginTransaction();

      await conn.execute('DELETE FROM order_items WHERE media_file_id = ?', [id]);

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await conn.execute(
        'UPDATE media_files SET deleted_at = ?, deleted_by = ? WHERE id = ? AND tenant_id = ?',
        [now, userId, id, tenantId],
      );

      const auditId = uuidv4();
      await conn.execute(
        `INSERT INTO audit_log (id, tenant_id, user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, ?, 'delete', 'media', ?, ?)`,
        [auditId, tenantId, userId, id, JSON.stringify({ filename: media.original_path })],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await Promise.allSettled([
      deleteObject(media.original_path, true).catch(() => deletionErrors.push('original')),
      deleteObject(media.optimized_path, false).catch(() => deletionErrors.push('optimized')),
      deleteObject(media.thumbnail_path, false).catch(() => deletionErrors.push('thumbnail')),
    ]);

    reply.status(200).send({
      id,
      deleted: true,
      storage_errors: deletionErrors.length > 0 ? deletionErrors : undefined,
    });
  });

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const { is_for_sale, price, display_order, album_id } = request.body || {};
    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM media_files WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, tenantId],
    );
    if (existing.length === 0) throw notFound('Media not found');

    if (album_id) {
      const [album] = await pool.execute(
        'SELECT id FROM albums WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
        [album_id, tenantId],
      );
      if (album.length === 0) throw notFound('Album not found');
    }

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

async function doUpload(buffer, originalFilename, mimeType, tenantId, albumId) {
  if (buffer.length === 0) throw badRequest('Empty file');
  if (buffer.length > MAX_FILE_SIZE) {
    throw badRequest(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const ext = extname(originalFilename).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    throw badRequest(`File type not supported: ${ext}. Allowed: ${ALLOWED_EXT.join(', ')}`);
  }

  if (!ALLOWED_MIME.includes(mimeType)) {
    throw badRequest(`MIME type not supported: ${mimeType}`);
  }

  const detectedMime = detectMimeFromBuffer(buffer);
  if (!detectedMime) {
    throw badRequest('File does not appear to be a valid image');
  }

  const safeFilename = sanitizeFilename(originalFilename);

  let processed;
  try {
    processed = await processImage(buffer);
  } catch (err) {
    if (err.code === 'DECODE_FAILED') throw badRequest('Cannot decode image: file may be corrupted');
    if (err.code === 'UNSUPPORTED_FORMAT') throw badRequest(err.message);
    throw badRequest('Image processing failed: ' + err.message);
  }

  const { optimizedBuffer, thumbnailBuffer, width, height, sizeBytes } = processed;

  const fileId = uuidv4();
  const storageKey = `${tenantId}/${fileId}${ext}`;
  const optimizedKey = `${tenantId}/${fileId}_optimized.jpg`;
  const thumbKey = `${tenantId}/${fileId}_thumb.jpg`;

  try {
    await Promise.all([
      uploadOriginal(storageKey, buffer, mimeType),
      uploadOptimized(optimizedKey, optimizedBuffer, 'image/jpeg'),
      uploadOptimized(thumbKey, thumbnailBuffer, 'image/jpeg'),
    ]);
  } catch (err) {
    await Promise.allSettled([
      deleteObject(storageKey, true).catch(() => {}),
      deleteObject(optimizedKey, false).catch(() => {}),
      deleteObject(thumbKey, false).catch(() => {}),
    ]);
    throw Object.assign(err, { message: 'Storage upload failed: ' + err.message });
  }

  const pool = getPool();
  try {
    await pool.execute(
      `INSERT INTO media_files
        (id, tenant_id, album_id, filename, original_path, optimized_path, thumbnail_path,
         mime_type, size_bytes, width, height, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fileId, tenantId, albumId, safeFilename, storageKey, optimizedKey, thumbKey,
       mimeType, sizeBytes, width, height, 0],
    );
  } catch (err) {
    await Promise.allSettled([
      deleteObject(storageKey, true).catch(() => {}),
      deleteObject(optimizedKey, false).catch(() => {}),
      deleteObject(thumbKey, false).catch(() => {}),
    ]);
    throw Object.assign(err, { message: 'Database insert failed: ' + err.message });
  }

  return {
    _storageKeys: [
      { key: storageKey, isOriginal: true },
      { key: optimizedKey, isOriginal: false },
      { key: thumbKey, isOriginal: false },
    ],
    id: fileId,
    filename: safeFilename,
    optimized_url: `/cdn/${optimizedKey}`,
    thumbnail_url: `/cdn/${thumbKey}`,
    width,
    height,
    size_bytes: sizeBytes,
  };
}
