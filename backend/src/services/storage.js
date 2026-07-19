import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/index.js';

let s3Client;

function getS3() {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.storage.endpoint,
      region: env.storage.region,
      credentials: {
        accessKeyId: env.storage.accessKeyId,
        secretAccessKey: env.storage.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export async function uploadOriginal(key, buffer, mimeType) {
  const s3 = getS3();
  await s3.send(new PutObjectCommand({
    Bucket: env.storage.bucketOriginals,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'private, no-cache',
  }));
}

export async function uploadOptimized(key, buffer, mimeType) {
  const s3 = getS3();
  await s3.send(new PutObjectCommand({
    Bucket: env.storage.bucketOptimized,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

export async function deleteObject(key, isOriginal = true) {
  const s3 = getS3();
  const Bucket = isOriginal ? env.storage.bucketOriginals : env.storage.bucketOptimized;
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
}

export async function deleteObjects(keys) {
  const s3 = getS3();
  const originalKeys = keys.filter(k => k.isOriginal !== false).map(k => ({ Key: k.key }));
  const optimizedKeys = keys.filter(k => k.isOriginal === false).map(k => ({ Key: k.key }));

  const promises = [];
  if (originalKeys.length > 0) {
    promises.push(s3.send(new DeleteObjectsCommand({
      Bucket: env.storage.bucketOriginals,
      Delete: { Objects: originalKeys, Quiet: true },
    })));
  }
  if (optimizedKeys.length > 0) {
    promises.push(s3.send(new DeleteObjectsCommand({
      Bucket: env.storage.bucketOptimized,
      Delete: { Objects: optimizedKeys, Quiet: true },
    })));
  }
  await Promise.allSettled(promises);
}

export async function generateSignedUrl(key, expiresIn = 3600) {
  const s3 = getS3();
  const command = new GetObjectCommand({
    Bucket: env.storage.bucketOriginals,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}
