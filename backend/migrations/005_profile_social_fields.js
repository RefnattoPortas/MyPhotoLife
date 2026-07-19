import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('[Migration 005] Connected to MySQL');

  try {
    await connection.query('USE myphotolife');

    await connection.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS facebook VARCHAR(255) DEFAULT NULL AFTER twitter,
        ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255) DEFAULT NULL AFTER facebook,
        ADD COLUMN IF NOT EXISTS youtube VARCHAR(255) DEFAULT NULL AFTER linkedin,
        ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255) DEFAULT NULL AFTER youtube,
        ADD COLUMN IF NOT EXISTS cover_url VARCHAR(512) DEFAULT NULL AFTER whatsapp,
        ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(512) DEFAULT NULL AFTER cover_url
    `);
    console.log('[Migration 005] Added social and profile columns to tenants table');

    await connection.query(`
      ALTER TABLE schedule
        MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Agenda Aberta'
    `);
    console.log('[Migration 005] Ensured schedule status column');

    console.log('[Migration 005] Applied successfully');
  } catch (err) {
    console.error('[Migration 005] Error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
