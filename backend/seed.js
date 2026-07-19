import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { env } from './src/config/index.js';

const SALT_ROUNDS = 12;

async function seed() {
  const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
  });

  const email = process.env.SEED_EMAIL || '';
  const password = process.env.SEED_PASSWORD || '';
  const displayName = process.env.SEED_NAME || 'Administrador';
  const slug = process.env.SEED_SLUG || '';
  const tenantName = process.env.SEED_TENANT || 'Conta de Teste';

  if (!email || !password || !slug) {
    console.log('[Seed] Defina SEED_EMAIL, SEED_PASSWORD e SEED_SLUG no .env');
    await pool.end();
    return;
  }

  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [email],
  );

  if (existing.length > 0) {
    console.log('[Seed] Conta de teste ja existe.');
    await pool.end();
    return;
  }

  const tenantId = uuidv4();
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      'INSERT INTO tenants (id, name, email, slug, subdomain) VALUES (?, ?, ?, ?, ?)',
      [tenantId, tenantName, email, slug, slug],
    );

    await conn.execute(
      'INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, tenantId, email, passwordHash, displayName, 'admin'],
    );

    await conn.commit();
    console.log('[Seed] Conta de teste criada com sucesso!');
  } catch (err) {
    await conn.rollback();
    console.error('[Seed] Erro ao criar conta de teste:', err.message);
  } finally {
    conn.release();
  }

  await pool.end();
}

seed();
