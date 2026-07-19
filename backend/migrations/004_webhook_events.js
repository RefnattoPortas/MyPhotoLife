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

  console.log('[Migration 004] Connected to MySQL');

  try {
    await connection.query('USE myphotolife');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id                CHAR(36) PRIMARY KEY,
        event_id          VARCHAR(255) NOT NULL,
        order_id          CHAR(36) DEFAULT NULL,
        gateway_payment_id VARCHAR(255) DEFAULT NULL,
        event_type        VARCHAR(50) NOT NULL DEFAULT 'pix',
        old_status        VARCHAR(20) DEFAULT NULL,
        new_status        VARCHAR(20) DEFAULT NULL,
        source_ip         VARCHAR(45) DEFAULT NULL,
        amount            DECIMAL(10,2) DEFAULT NULL,
        currency          VARCHAR(3) DEFAULT 'BRL',
        processed         BOOLEAN NOT NULL DEFAULT FALSE,
        error_message     TEXT DEFAULT NULL,
        created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        UNIQUE KEY uk_webhook_event_id (event_id),
        INDEX idx_webhook_order (order_id),
        INDEX idx_webhook_event_type (event_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Migration 004] Created webhook_events table');

    await connection.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) DEFAULT NULL AFTER id,
        ADD UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency (idempotency_key)
    `);
    console.log('[Migration 004] Ensured order idempotency key column/index');

    console.log('[Migration 004] Applied successfully');
  } catch (err) {
    console.error('[Migration 004] Error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
