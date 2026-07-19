import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { uploadOriginal, uploadOptimized } from '../services/storage.js';
import { processImage } from '../services/image.js';
import { notFound, badRequest } from '../utils/errors.js';
import { extname } from 'path';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_DIMENSION = 10000;

// Assinaturas magic bytes para validar tipo real do arquivo
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

    const data = await request.file();
    if (!data) throw badRequest('Arquivo é obrigatório');

    const ext = extname(data.filename).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      throw badRequest(`Tipo de arquivo não suportado: ${ext}. Permitidos: ${ALLOWED_EXT.join(', ')}`);
    }

    const buffer = await data.toBuffer();

    if (buffer.length === 0) throw badRequest('Arquivo vazio');
    if (buffer.length > MAX_FILE_SIZE) {
      throw badRequest(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const mimeType = data.mimetype;
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw badRequest(`Tipo MIME não suportado: ${mimeType}`);
    }

    // Validar assinatura real do arquivo (magic bytes)
    const detectedMime = detectMimeFromBuffer(buffer);
    if (!detectedMime) {
      throw badRequest('Arquivo não parece ser uma imagem válida');
    }

    const safeFilename = sanitizeFilename(data.filename);

    // Processa imagem: remove metadados, otimiza, cria thumbnail
    const { optimizedBuffer, thumbnailBuffer, width, height, sizeBytes } = await processImage(buffer, mimeType);

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      throw badRequest(`Dimensões da imagem muito grandes (${width}x${height}). Máximo: ${MAX_DIMENSION}px`);
    }

    const fileId = uuidv4();
    const storageKey = `${tenantId}/${fileId}${ext}`;
    const optimizedKey = `${tenantId}/${fileId}_optimized.jpg`;
    const thumbKey = `${tenantId}/${fileId}_thumb.jpg`;

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
      [fileId, tenantId, albumId, safeFilename, storageKey, optimizedKey, thumbKey,
       mimeType, sizeBytes, width, height, 0],
    );

    reply.status(201).send({
      id: fileId,
      filename: safeFilename,
      optimized_url: `/cdn/${optimizedKey}`,
      thumbnail_url: `/cdn/${thumbKey}`,
      width,
      height,
      size_bytes: sizeBytes,
    });
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT id FROM media_files WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );
    if (rows.length === 0) throw notFound('Mídia não encontrada');

    await pool.execute('DELETE FROM media_files WHERE id = ? AND tenant_id = ?', [id, tenantId]);

    reply.status(200).send({ id, deleted: true });
  });

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params;
    const tenantId = request.tenantId;
    const { is_for_sale, price, display_order, album_id } = request.body || {};
    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM media_files WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );
    if (existing.length === 0) throw notFound('Mídia não encontrada');

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
