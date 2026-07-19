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

  console.log('[Migration 002] Connected to MySQL');

  try {
    await connection.query('USE myphotolife');

    await connection.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS headline VARCHAR(255) DEFAULT NULL AFTER bio,
        ADD COLUMN IF NOT EXISTS instagram VARCHAR(255) DEFAULT NULL AFTER theme_config,
        ADD COLUMN IF NOT EXISTS twitter VARCHAR(255) DEFAULT NULL AFTER instagram,
        ADD COLUMN IF NOT EXISTS phone VARCHAR(30) DEFAULT NULL AFTER twitter,
        ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30) DEFAULT NULL AFTER phone
    `);
    console.log('[Migration 002] Added columns to tenants table');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        id              CHAR(36) PRIMARY KEY,
        tenant_id       CHAR(36) NOT NULL,
        title           VARCHAR(255) NOT NULL,
        event_date      DATE NOT NULL,
        location        VARCHAR(255) DEFAULT NULL,
        status          VARCHAR(50) NOT NULL DEFAULT 'Agenda Aberta',
        created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_schedule_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        INDEX idx_schedule_tenant (tenant_id),
        INDEX idx_schedule_date (tenant_id, event_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Migration 002] Created schedule table');

    console.log('[Migration 002] Applied successfully');
  } catch (err) {
    console.error('[Migration 002] Error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
