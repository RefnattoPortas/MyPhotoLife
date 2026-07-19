import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getPool } from '../config/database.js';
import { badRequest, unauthorized } from '../utils/errors.js';

const SALT_ROUNDS = 12;

const RESERVED_SLUGS = [
  'api', 'login', 'register', 'dashboard', 'admin', 'support',
  'www', 'app', 'dev', 'test', 'mail', 'webmail',
  'billing', 'help', 'status', 'docs', 'cdn', 'static',
];

function normalizeEmail(email) {
  if (!email) return '';
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf('@');
  if (atIndex > 0) {
    const localPart = normalized.substring(0, atIndex).replace(/\./g, '').replace(/\+.*$/, '');
    return localPart + normalized.substring(atIndex);
  }
  return normalized;
}

function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') return 'Slug é obrigatório';
  const s = slug.toLowerCase().trim();
  if (s.length < 3 || s.length > 63) return 'Slug deve ter entre 3 e 63 caracteres';
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)) return 'Slug deve conter apenas letras minúsculas, números e hífens, sem hífen no início ou fim';
  if (RESERVED_SLUGS.includes(s)) return `Slug "${s}" é reservado pelo sistema`;
  return null;
}

export default async function authRoutes(fastify) {
  fastify.post('/register', async (request, reply) => {
    const { name, email, password, password_confirm, slug } = request.body || {};

    if (!name || !email || !password || !slug) {
      throw badRequest('Nome, email, senha e slug são obrigatórios');
    }

    if (name.length < 2 || name.length > 100) {
      throw badRequest('Nome deve ter entre 2 e 100 caracteres');
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes('@') || normalizedEmail.length > 254) {
      throw badRequest('Email inválido');
    }

    if (password.length < 8) {
      throw badRequest('Senha deve ter pelo menos 8 caracteres');
    }

    if (password.length > 128) {
      throw badRequest('Senha deve ter no máximo 128 caracteres');
    }

    if (password_confirm !== undefined && password !== password_confirm) {
      throw badRequest('Senhas não conferem');
    }

    const slugError = validateSlug(slug);
    if (slugError) throw badRequest(slugError);

    const normalizedSlug = slug.toLowerCase().trim();

    const pool = getPool();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.execute(
        'SELECT id FROM tenants WHERE slug = ? OR email = ? LIMIT 1 FOR UPDATE',
        [normalizedSlug, normalizedEmail],
      );
      if (existing.length > 0) {
        throw badRequest('Este slug ou email já está em uso');
      }

      const tenantId = uuidv4();
      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      await conn.execute(
        'INSERT INTO tenants (id, name, email, slug, subdomain) VALUES (?, ?, ?, ?, ?)',
        [tenantId, name, normalizedEmail, normalizedSlug, normalizedSlug],
      );

      await conn.execute(
        'INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, tenantId, normalizedEmail, passwordHash, name, 'owner'],
      );

      await conn.commit();

      const token = fastify.jwt.sign({
        sub: userId,
        tenantId,
        role: 'owner',
      });

      reply.status(201).send({
        token,
        user: { id: userId, email: normalizedEmail, name, role: 'owner' },
        tenant: { id: tenantId, slug: normalizedSlug },
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      throw badRequest('Email e senha são obrigatórios');
    }

    const normalizedEmail = normalizeEmail(email);

    const pool = getPool();

    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.password_hash, u.display_name, u.role, u.tenant_id,
              t.name AS tenant_name, t.slug AS tenant_slug, t.is_active
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = ? AND u.is_active = TRUE`,
      [normalizedEmail],
    );

    if (users.length === 0) {
      throw unauthorized('Email ou senha inválidos');
    }

    const user = users[0];

    if (!user.is_active) {
      throw unauthorized('Email ou senha inválidos');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw unauthorized('Email ou senha inválidos');
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
      throw unauthorized('Usuário não encontrado');
    }

    return { user: users[0] };
  });
}
