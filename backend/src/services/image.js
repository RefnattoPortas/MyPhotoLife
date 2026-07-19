import sharp from 'sharp';
import { env } from '../config/index.js';

export async function processImage(buffer, _mimeType) {
  const image = sharp(buffer, {
    // Remove todos os metadados EXIF (incluindo GPS)
    pages: 1,
  });

  const metadata = await image.metadata();

  // Remove metadados sensíveis (GPS, câmera, etc.)
  const withoutExif = sharp(buffer).withMetadata(false);

  // Processa imagem otimizada
  const optimizedBuffer = await withoutExif
    .rotate() // Corrige orientação baseada em EXIF
    .resize({
      width: env.image.maxWidth,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .jpeg({ quality: env.image.quality, progressive: true, mozjpeg: true })
    .toBuffer();

  // Cria thumbnail
  const thumbnailBuffer = await withoutExif
    .rotate()
    .resize(env.image.thumbWidth, env.image.thumbHeight, {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({ quality: 70 })
    .toBuffer();

  return {
    optimizedBuffer,
    thumbnailBuffer,
    width: metadata.width,
    height: metadata.height,
    sizeBytes: buffer.length,
  };
}
