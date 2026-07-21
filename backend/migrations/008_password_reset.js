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
    ALTER TABLE users
    ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL AFTER is_active,
    ADD COLUMN reset_token_expires_at TIMESTAMP NULL DEFAULT NULL AFTER reset_token
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prt_user (user_id),
      INDEX idx_prt_token (token_hash),
      CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('[Migration 008] password_reset_tokens table + users.reset_token columns created');
  await connection.end();
}

migrate().catch((err) => {
  console.error('Migration 008 failed:', err);
  process.exit(1);
});
