import sharp from 'sharp';
import { env } from '../config/index.js';

export async function processImage(buffer, mimeType) {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const optimizedBuffer = await image
    .rotate()
    .resize({
      width: env.image.maxWidth,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .jpeg({ quality: env.image.quality, progressive: true, mozjpeg: true })
    .toBuffer();

  const thumbnailBuffer = await sharp(buffer)
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
