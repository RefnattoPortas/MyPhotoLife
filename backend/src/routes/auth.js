import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getPool } from '../config/database.js';
import { badRequest, unauthorized, tooManyRequests } from '../utils/errors.js';
import { sendPasswordResetEmail } from '../services/email.js';

const SALT_ROUNDS = 12;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const resetAttempts = new Map();

const RESERVED_SLUGS = [
  'api', 'login', 'register', 'dashboard', 'admin', 'support',
  'www', 'app', 'dev', 'test', 'mail', 'webmail',
  'billing', 'help', 'status', 'docs', 'cdn', 'static',
  'suporte', 'termos', 'privacidade', 'checkout', 'pagamentos',
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

function getPasswordStrength(password) {
  if (!password) return { level: 'fraca', label: 'Fraca' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 'fraca', label: 'Fraca' };
  if (score <= 4) return { level: 'media', label: 'Média' };
  return { level: 'forte', label: 'Forte' };
}

function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') return 'Slug é obrigatório';
  const s = slug.toLowerCase().trim();
  if (s.length < 3 || s.length > 63) return 'Slug deve ter entre 3 e 63 caracteres';
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)) return 'Slug deve conter apenas letras minúsculas, números e hífens, sem hífen no início ou fim';
  if (RESERVED_SLUGS.includes(s)) return `Slug "${s}" é reservado pelo sistema`;
  return null;
}

function normalizeSlug(slug) {
  if (!slug) return '';
  return slug.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

function setTokenCookie(fastify, reply, token) {
  reply.setCookie(fastify.cookieName, token, fastify.cookieOptions);
}

function checkResetRateLimit(email) {
  const key = `reset:${email}`;
  const now = Date.now();
  const entry = resetAttempts.get(key);
  if (entry) {
    if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS && now - entry.resetAt < RATE_LIMIT_WINDOW) {
      return false;
    }
    if (now - entry.resetAt >= RATE_LIMIT_WINDOW) {
      resetAttempts.set(key, { count: 1, resetAt: now });
      return true;
    }
    entry.count++;
    return true;
  }
  resetAttempts.set(key, { count: 1, resetAt: now });
  return true;
}

function cleanupResetRateLimit() {
  const now = Date.now();
  for (const [key, entry] of resetAttempts) {
    if (now - entry.resetAt >= RATE_LIMIT_WINDOW) {
      resetAttempts.delete(key);
    }
  }
}
setInterval(cleanupResetRateLimit, RATE_LIMIT_WINDOW);

export default async function authRoutes(fastify) {
  fastify.post('/register', async (request, reply) => {
    const { name, email, password, password_confirm, slug } = request.body || {};

    if (!name || !email || !password || !slug) {
      throw badRequest('Nome, email, senha e slug são obrigatórios');
    }

    const normalizedName = name.trim();
    if (normalizedName.length < 2 || normalizedName.length > 100) {
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

    const passwordStrength = getPasswordStrength(password);
    if (passwordStrength.level === 'fraca') {
      throw badRequest('Senha muito fraca. Use pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais');
    }

    const slugError = validateSlug(slug);
    if (slugError) throw badRequest(slugError);

    const normalizedSlug = normalizeSlug(slug);

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
        [tenantId, normalizedName, normalizedEmail, normalizedSlug, normalizedSlug],
      );

      await conn.execute(
        'INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, tenantId, normalizedEmail, passwordHash, normalizedName, 'owner'],
      );

      await conn.commit();

      const token = fastify.jwt.sign({
        sub: userId,
        tenantId,
        role: 'owner',
      });

      setTokenCookie(fastify, reply, token);

      reply.status(201).send({
        token,
        csrfToken: token,
        user: { id: userId, email: normalizedEmail, name: normalizedName, role: 'owner', password_strength: passwordStrength.label },
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
      throw badRequest('Informe seu email e senha');
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

    setTokenCookie(fastify, reply, token);

    reply.send({
      token,
      csrfToken: token,
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

  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie(fastify.cookieName, { path: '/' });
    reply.send({ message: 'Sessão encerrada com sucesso' });
  });

  fastify.get('/session', { preHandler: [fastify.authenticate] }, async (request) => {
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

    const cookieValue = request.cookies?.[fastify.cookieName];
    const u = users[0];
    return {
      user: {
        id: u.id,
        email: u.email,
        name: u.display_name,
        role: u.role,
        created_at: u.created_at,
      },
      tenant: {
        name: u.tenant_name,
        slug: u.tenant_slug,
      },
      csrfToken: cookieValue || null,
    };
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

  fastify.get('/slug-check', async (request) => {
    const { slug } = request.query;
    if (!slug) {
      return { available: false, error: 'Slug é obrigatório' };
    }

    const slugError = validateSlug(slug);
    if (slugError) {
      return { available: false, error: slugError };
    }

    const normalizedSlug = normalizeSlug(slug);
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id FROM tenants WHERE slug = ? LIMIT 1',
      [normalizedSlug],
    );

    return { available: rows.length === 0, slug: normalizedSlug };
  });

  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = request.body || {};

    const genericMessage = 'Se existir uma conta com este email, enviaremos as instruções de recuperação.';

    if (!email) {
      return reply.send({ message: genericMessage });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes('@')) {
      return reply.send({ message: genericMessage });
    }

    if (!checkResetRateLimit(normalizedEmail)) {
      throw tooManyRequests('Muitas tentativas. Tente novamente mais tarde.');
    }

    const pool = getPool();
    const [users] = await pool.execute(
      'SELECT id, email, display_name FROM users WHERE email = ? AND is_active = TRUE LIMIT 1',
      [normalizedEmail],
    );

    if (users.length === 0) {
      return reply.send({ message: genericMessage });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, user.id, tokenHash, expiresAt],
    );

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
      await sendPasswordResetEmail({ to: normalizedEmail, name: user.display_name, resetUrl });
    } catch (err) {
      console.error('[Password Reset] Failed to send email:', err.message);
    }

    reply.send({ message: genericMessage });
  });

  fastify.post('/reset-password', async (request, reply) => {
    const { token, email, password, password_confirm } = request.body || {};

    if (!token || !email || !password) {
      throw badRequest('Token, email e nova senha são obrigatórios');
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

    const passwordStrength = getPasswordStrength(password);
    if (passwordStrength.level === 'fraca') {
      throw badRequest('Senha muito fraca. Use pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais');
    }

    const normalizedEmail = normalizeEmail(email);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const pool = getPool();

    const [tokens] = await pool.execute(
      `SELECT prt.id, prt.user_id, prt.expires_at, u.email
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ? AND prt.used_at IS NULL AND u.email = ? AND u.is_active = TRUE
       LIMIT 1`,
      [tokenHash, normalizedEmail],
    );

    if (tokens.length === 0) {
      throw badRequest('Link de recuperação inválido, expirado ou já utilizado');
    }

    const resetToken = tokens[0];

    if (new Date() > new Date(resetToken.expires_at)) {
      throw badRequest('Este link de recuperação expirou. Solicite um novo.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        'UPDATE password_reset_tokens SET used_at = ? WHERE id = ?',
        [now, resetToken.id],
      );

      await conn.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passwordHash, resetToken.user_id],
      );

      await conn.commit();

      reply.send({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
}
