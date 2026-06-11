import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { getPool } from '../config/database.js';
import { badRequest, unauthorized } from '../utils/errors.js';

const SALT_ROUNDS = 12;

export default async function authRoutes(fastify) {
  // POST /api/auth/register - Cria tenant + primeiro usuário (owner)
  fastify.post('/register', async (request, reply) => {
    const { name, email, password, slug } = request.body || {};

    if (!name || !email || !password || !slug) {
      throw badRequest('name, email, password and slug are required');
    }

    if (password.length < 8) {
      throw badRequest('Password must have at least 8 characters');
    }

    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM tenants WHERE slug = ? OR email = ? LIMIT 1',
      [slug, email],
    );
    if (existing.length > 0) {
      throw badRequest('Slug or email already in use');
    }

    const tenantId = uuidv4();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        'INSERT INTO tenants (id, name, email, slug, subdomain) VALUES (?, ?, ?, ?, ?)',
        [tenantId, name, email, slug, slug],
      );

      await conn.execute(
        'INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, tenantId, email, passwordHash, name, 'owner'],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const token = fastify.jwt.sign({
      sub: userId,
      tenantId,
      role: 'owner',
    });

    reply.status(201).send({
      token,
      user: { id: userId, email, name, role: 'owner' },
      tenant: { id: tenantId, slug },
    });
  });

  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      throw badRequest('email and password are required');
    }

    const pool = getPool();

    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.password_hash, u.display_name, u.role, u.tenant_id,
              t.name AS tenant_name, t.slug AS tenant_slug, t.is_active
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = ? AND u.is_active = TRUE`,
      [email],
    );

    if (users.length === 0) {
      throw unauthorized('Invalid credentials');
    }

    const user = users[0];

    if (!user.is_active) {
      throw unauthorized('Account is disabled');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw unauthorized('Invalid credentials');
    }

    const token = fastify.jwt.sign({
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    });

    reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.display_name,
        role: user.role,
      },
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name,
        slug: user.tenant_slug,
      },
    });
  });

  // GET /api/auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const pool = getPool();
    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.display_name, u.role, u.created_at,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = ?`,
      [request.user.sub],
    );

    if (users.length === 0) {
      throw unauthorized('User not found');
    }

    return { user: users[0] };
  });
}
