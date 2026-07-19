import mysql from 'mysql2/promise';
import 'dotenv/config';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myphotolife',
    charset: 'utf8mb4',
    timezone: '+00:00',
  });
}

function getS3() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  });
}

async function listAllKeys(bucket) {
  const s3 = getS3();
  const keys = [];
  let continuationToken;

  do {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }));
    if (result.Contents) {
      for (const obj of result.Contents) {
        keys.push(obj.Key);
      }
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function reconcile() {
  const conn = await getConnection();
  const results = {
    orphanedMediaDb: [],
    orphanedMediaS3: [],
    orphanedS3Original: [],
    orphanedS3Optimized: [],
    mediaMissingS3: [],
    tenantDeletionProtection: [],
  };

  const bucketOriginals = process.env.S3_BUCKET_ORIGINALS || 'myphotolife-originals';
  const bucketOptimized = process.env.S3_BUCKET_OPTIMIZED || 'myphotolife-optimized';

  console.log('Listing S3 objects...');
  const originalKeys = await listAllKeys(bucketOriginals);
  const optimizedKeys = await listAllKeys(bucketOptimized);
  console.log(`  Found ${originalKeys.length} originals, ${optimizedKeys.length} optimized`);

  const [mediaRows] = await conn.execute(
    'SELECT id, tenant_id, album_id, original_path, optimized_path, thumbnail_path, deleted_at FROM media_files',
  );

  const [albumRows] = await conn.execute(
    'SELECT id, tenant_id, title, deleted_at FROM albums',
  );

  const [scheduleRows] = await conn.execute(
    'SELECT id, tenant_id, title, deleted_at FROM schedule',
  );

  const dbOriginalKeys = new Set();
  const dbOptimizedKeys = new Set();

  for (const m of mediaRows) {
    if (m.original_path) dbOriginalKeys.add(m.original_path);
    if (m.optimized_path) dbOptimizedKeys.add(m.optimized_path);
    if (m.thumbnail_path) dbOptimizedKeys.add(m.thumbnail_path);
  }

  for (const key of originalKeys) {
    if (!dbOriginalKeys.has(key) && key.startsWith('uploads/')) {
      results.orphanedS3Original.push(key);
    }
  }

  for (const key of optimizedKeys) {
    if (!dbOptimizedKeys.has(key) && key.startsWith('uploads/')) {
      results.orphanedS3Optimized.push(key);
    }
  }

  for (const m of mediaRows) {
    if (m.deleted_at) continue;

    if (m.original_path && m.original_path.startsWith('uploads/') && !originalKeys.includes(m.original_path)) {
      results.mediaMissingS3.push({ id: m.id, path: m.original_path, type: 'original' });
    }
    if (m.optimized_path && m.optimized_path.startsWith('uploads/') && !optimizedKeys.includes(m.optimized_path)) {
      results.mediaMissingS3.push({ id: m.id, path: m.optimized_path, type: 'optimized' });
    }
    if (m.thumbnail_path && m.thumbnail_path.startsWith('uploads/') && !optimizedKeys.includes(m.thumbnail_path)) {
      results.mediaMissingS3.push({ id: m.id, path: m.thumbnail_path, type: 'thumbnail' });
    }
  }

  const albumIds = new Set(albumRows.filter(a => !a.deleted_at).map(a => a.id));
  for (const m of mediaRows) {
    if (m.deleted_at) continue;
    if (m.album_id && !albumIds.has(m.album_id)) {
      results.orphanedMediaDb.push({ id: m.id, album_id: m.album_id, tenant_id: m.tenant_id });
    }
  }

  const albumTenantMap = new Map();
  for (const a of albumRows) {
    albumTenantMap.set(a.id, a.tenant_id);
  }
  for (const m of mediaRows) {
    if (m.deleted_at) continue;
    if (m.album_id) {
      const expectedTenant = albumTenantMap.get(m.album_id);
      if (expectedTenant && m.tenant_id !== expectedTenant) {
        results.orphanedMediaDb.push({ id: m.id, issue: 'tenant mismatch', media_tenant: m.tenant_id, album_tenant: expectedTenant });
      }
    }
  }

  console.log('\n--- Reconciliation Results ---');
  console.log(`Orphaned media in DB (album deleted but media not): ${results.orphanedMediaDb.length}`);
  for (const o of results.orphanedMediaDb.slice(0, 10)) {
    console.log(`  Media ${o.id} (album_id=${o.album_id})`);
  }

  console.log(`\nOrphaned S3 originals (no DB record): ${results.orphanedS3Original.length}`);
  for (const o of results.orphanedS3Original.slice(0, 10)) {
    console.log(`  ${o}`);
  }

  console.log(`\nOrphaned S3 optimized (no DB record): ${results.orphanedS3Optimized.length}`);
  for (const o of results.orphanedS3Optimized.slice(0, 10)) {
    console.log(`  ${o}`);
  }

  console.log(`\nActive media missing S3 files: ${results.mediaMissingS3.length}`);
  for (const o of results.mediaMissingS3.slice(0, 10)) {
    console.log(`  Media ${o.id} missing ${o.type}: ${o.path}`);
  }

  if (results.orphanedMediaDb.length > 0) {
    console.log('\nTo fix orphaned media, run:');
    console.log('  UPDATE media_files SET deleted_at = NOW() WHERE id IN (...);');
  }

  if (results.orphanedS3Original.length > 0) {
    console.log('\nTo clean orphaned S3 originals, use the S3 console or aws-cli:');
    console.log(`  aws s3 rm s3://${bucketOriginals}/ --recursive --exclude "*" --include "..."`);
  }

  await conn.end();
  return results;
}

reconcile().catch((err) => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});
