import mysql from 'mysql2/promise';
import env from './env.js';

let pool;

export async function connectDatabase() {
  pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    charset: 'utf8mb4',
    timezone: '+00:00',
  });

  const connection = await pool.getConnection();
  connection.release();
  console.log('[DB] MySQL pool connected');

  return pool;
}

export function getPool() {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}
