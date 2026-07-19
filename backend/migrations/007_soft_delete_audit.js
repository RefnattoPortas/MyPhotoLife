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
    ALTER TABLE albums
    ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER created_at,
    ADD COLUMN deleted_by CHAR(36) DEFAULT NULL AFTER deleted_at
  `);

  await connection.execute(`
    ALTER TABLE media_files
    ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER created_at,
    ADD COLUMN deleted_by CHAR(36) DEFAULT NULL AFTER deleted_at
  `);

  await connection.execute(`
    ALTER TABLE schedule
    ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
    ADD COLUMN deleted_by CHAR(36) DEFAULT NULL AFTER deleted_at
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id CHAR(36) PRIMARY KEY,
      tenant_id CHAR(36) DEFAULT NULL,
      user_id CHAR(36) DEFAULT NULL,
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id CHAR(36) DEFAULT NULL,
      details JSON DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_tenant (tenant_id),
      INDEX idx_audit_action (action),
      INDEX idx_audit_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('[Migration 007] soft delete + audit_log table created');
  await connection.end();
}

migrate().catch((err) => {
  console.error('Migration 007 failed:', err);
  process.exit(1);
});
