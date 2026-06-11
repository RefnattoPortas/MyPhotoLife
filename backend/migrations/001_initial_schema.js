import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('[Migration] Connected to MySQL');

  const schemaPath = join(__dirname, '..', '..', 'database', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  try {
    await connection.query(schema);
    console.log('[Migration] Schema applied successfully');
  } catch (err) {
    console.error('[Migration] Error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
