import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-dev-secret-change-in-production';
const jwtExpiresIn = '7d';
const COOKIE_NAME = 'auth_token';

let adminClient = null;

function getAdminClient() {
  if (adminClient) return adminClient;
  if (!supabaseUrl || !serviceRoleKey) return null;
  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

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
  const RESERVED = ['api', 'login', 'register', 'dashboard', 'admin', 'support', 'www', 'app', 'dev', 'test', 'mail', 'webmail', 'billing', 'help', 'status', 'docs', 'cdn', 'static', 'suporte', 'termos', 'privacidade', 'checkout', 'pagamentos'];
  if (RESERVED.includes(s)) return `Slug "${s}" é reservado pelo sistema`;
  return null;
}

function signToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

function setCookieHeader(token) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${isProduction ? '; Secure' : ''}`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

const ERROR_CODES = {
  INVALID_CREDENTIALS: { status: 401, message: 'Email ou senha inválidos.' },
  MISSING_FIELDS: { status: 400, message: 'Preencha seu e-mail e sua senha.' },
  RATE_LIMITED: { status: 429, message: 'Muitas tentativas de acesso. Aguarde alguns minutos.' },
  BACKEND_UNAVAILABLE: { status: 503, message: 'O serviço de acesso está temporariamente indisponível. Tente novamente.' },
  UNEXPECTED: { status: 500, message: 'Não foi possível entrar agora. Tente novamente.' },
};

function errorResponse(code, extra) {
  const base = ERROR_CODES[code] || ERROR_CODES.UNEXPECTED;
  return {
    status: base.status,
    body: { error: true, statusCode: base.status, code, message: base.message, ...extra },
  };
}

export {
  getAdminClient,
  normalizeEmail,
  validateSlug,
  signToken,
  verifyToken,
  setCookieHeader,
  clearCookieHeader,
  errorResponse,
  ERROR_CODES,
  COOKIE_NAME,
};
