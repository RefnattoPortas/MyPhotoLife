import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
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

  const email = 'adm@myphotolife.com';
  const password = '123456789';
  const displayName = 'Administrador';
  const slug = 'adm';
  const tenantName = 'Conta de Teste';

  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [email],
  );

  if (existing.length > 0) {
    console.log('[Seed] Conta de teste já existe.');
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
    console.log('  Email:    adm@myphotolife.com');
    console.log('  Senha:    123456789');
    console.log('  Papel:    admin');
  } catch (err) {
    await conn.rollback();
    console.error('[Seed] Erro ao criar conta de teste:', err.message);
  } finally {
    conn.release();
  }

  await pool.end();
}

seed();
