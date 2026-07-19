import sharp from 'sharp';
import { env } from '../config/index.js';

const REJECTED_FORMATS = ['heif', 'heic', 'avif', 'tiff', 'bmp', 'gif'];

export async function validateImage(buffer) {
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw Object.assign(new Error('Cannot decode image'), { code: 'DECODE_FAILED' });
  }

  if (!metadata.width || !metadata.height) {
    throw Object.assign(new Error('Invalid image dimensions'), { code: 'INVALID_DIMENSIONS' });
  }

  if (REJECTED_FORMATS.includes(metadata.format)) {
    throw Object.assign(new Error(`Format ${metadata.format} not supported. Use JPEG, PNG or WebP.`), { code: 'UNSUPPORTED_FORMAT' });
  }

  if (metadata.width > 10000 || metadata.height > 10000) {
    throw Object.assign(new Error(`Image dimensions too large (${metadata.width}x${metadata.height}). Max: 10000px`), { code: 'DIMENSIONS_TOO_LARGE' });
  }

  if (metadata.chromaSubsampling && metadata.chromaSubsampling === '4:2:0') {
    // OK — common JPEG chroma
  }

  return metadata;
}

export async function processImage(buffer) {
  const metadata = await validateImage(buffer);

  const pipeline = sharp(buffer)
    .withMetadata(false)
    .rotate();

  const optimizedBuffer = await pipeline
    .clone()
    .resize({
      width: env.image.maxWidth,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .jpeg({ quality: env.image.quality, progressive: true, mozjpeg: true })
    .toBuffer();

  const thumbnailBuffer = await pipeline
    .clone()
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
