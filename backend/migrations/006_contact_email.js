import mysql from 'mysql2/promise';
import 'dotenv/config';

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myphotolife',
    charset: 'utf8mb4',
    timezone: '+00:00',
  });

  await connection.execute(`
    ALTER TABLE tenants
    ADD COLUMN contact_email VARCHAR(255) DEFAULT NULL AFTER profile_photo_url
  `);

  console.log('[Migration 006] contact_email column added to tenants');
  await connection.end();
}

migrate().catch((err) => {
  console.error('Migration 006 failed:', err);
  process.exit(1);
});
