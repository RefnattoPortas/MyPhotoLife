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

  console.log('[Migration 003] Connected to MySQL');

  try {
    await connection.query('USE myphotolife');

    await connection.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) DEFAULT NULL AFTER id,
        ADD COLUMN IF NOT EXISTS pix_qrcode TEXT DEFAULT NULL AFTER gateway_payment_id,
        ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT DEFAULT NULL AFTER pix_qrcode,
        ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMP NULL DEFAULT NULL AFTER pix_copy_paste,
        ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL DEFAULT NULL AFTER pix_expires_at,
        ADD UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency (idempotency_key)
    `);
    console.log('[Migration 003] Added columns to orders table');

    await connection.query(`
      ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_price,
        ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER unit_price
    `);
    console.log('[Migration 003] Added columns to order_items table');

    console.log('[Migration 003] Applied successfully');
  } catch (err) {
    console.error('[Migration 003] Error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
