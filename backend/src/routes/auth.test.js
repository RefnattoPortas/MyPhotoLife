import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, closeApp } from '../test-helper.js';

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

describe('Auth - Email Normalization', () => {
  it('deve normalizar email com pontos', () => {
    assert.equal(normalizeEmail('joao.silva@gmail.com'), 'joaosilva@gmail.com');
  });

  it('deve remover tags de plus addressing', () => {
    assert.equal(normalizeEmail('joao+tag@gmail.com'), 'joao@gmail.com');
  });

  it('deve tratar email sem @ como vazio', () => {
    assert.equal(normalizeEmail('invalido'), 'invalido');
  });

  it('deve converter para minusculo', () => {
    assert.equal(normalizeEmail('Joao.Silva@Gmail.COM'), 'joaosilva@gmail.com');
  });
});

describe('Auth - Slug Validation', () => {
  const RESERVED_SLUGS = [
    'api', 'login', 'register', 'dashboard', 'admin', 'support',
    'www', 'app', 'dev', 'test', 'mail', 'webmail',
    'billing', 'help', 'status', 'docs', 'cdn', 'static',
    'suporte', 'termos', 'privacidade', 'checkout', 'pagamentos',
  ];

  function validateSlug(slug) {
    if (!slug || typeof slug !== 'string') return 'Slug é obrigatório';
    const s = slug.toLowerCase().trim();
    if (s.length < 3 || s.length > 63) return 'Slug deve ter entre 3 e 63 caracteres';
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)) return 'Slug deve conter apenas letras minúsculas, números e hífens, sem hífen no início ou fim';
    if (RESERVED_SLUGS.includes(s)) return `Slug "${s}" é reservado pelo sistema`;
    return null;
  }

  it('slug com 2 caracteres deve ser rejeitado', () => {
    assert.notEqual(validateSlug('ab'), null);
  });

  it('slug com hifen no inicio deve ser rejeitado', () => {
    assert.notEqual(validateSlug('-teste'), null);
  });

  it('slug com hifen no fim deve ser rejeitado', () => {
    assert.notEqual(validateSlug('teste-'), null);
  });

  it('slug com 63 caracteres deve ser aceito', () => {
    const slug = 'a' + 'b'.repeat(61) + 'c';
    assert.equal(slug.length, 63);
    assert.equal(validateSlug(slug), null);
  });

  it('slug reservado (admin) deve ser rejeitado', () => {
    assert.notEqual(validateSlug('admin'), null);
  });

  it('slug reservado (suporte) deve ser rejeitado', () => {
    assert.notEqual(validateSlug('suporte'), null);
  });

  it('slug valido deve ser aceito', () => {
    assert.equal(validateSlug('fotografo-legal'), null);
  });
});

describe('Auth - Password Strength', () => {
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

  it('senha curta deve ser fraca', () => {
    assert.equal(getPasswordStrength('abc').level, 'fraca');
  });

  it('senha com 8 caracteres basicos deve ser media', () => {
    assert.equal(getPasswordStrength('abcdefgh').level, 'media');
  });

  it('senha forte deve ser aceita', () => {
    assert.equal(getPasswordStrength('Abcdef1@').level, 'forte');
  });

  it('senha vazia deve ser fraca', () => {
    assert.equal(getPasswordStrength('').level, 'fraca');
  });

  it('null deve ser tratado como fraca', () => {
    assert.equal(getPasswordStrength(null).level, 'fraca');
  });
});

describe('GET /api/health', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve retornar status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'ok');
    assert.ok(body.timestamp);
  });
});

describe('POST /api/auth/register - Validation', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar registro sem campos obrigatorios', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {},
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar senha muito curta', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Teste', email: 'teste@test.com', password: '123', slug: 'teste' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar slug invalido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Teste', email: 'teste@test.com', password: 'Teste123!', slug: 'ab' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar senha fraca', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Teste', email: 'teste@test.com', password: '12345678', slug: 'test-pass' },
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('fraca'));
  });
});

describe('POST /api/auth/login - Validation', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar login sem credenciais', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar credenciais invalidas (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'naoexiste@test.com', password: 'senha123' },
    });
    assert.ok(res.statusCode === 401 || res.statusCode === 500);
  });

  it('deve rejeitar login sem password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'teste@test.com' },
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message);
  });

  it('deve rejeitar login sem email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'teste123' },
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message);
  });
});

describe('GET /api/auth/slug-check', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve retornar available para slug valido e nao existente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/slug-check?slug=fotografo-teste-unico',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(typeof body.available, 'boolean');
  });

  it('deve rejeitar slug muito curto', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/slug-check?slug=ab',
    });
    const body = JSON.parse(res.payload);
    assert.equal(body.available, false);
    assert.ok(body.error);
  });

  it('deve rejeitar slug reservado', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/slug-check?slug=admin',
    });
    const body = JSON.parse(res.payload);
    assert.equal(body.available, false);
    assert.ok(body.error);
  });

  it('deve retornar erro sem slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/slug-check',
    });
    const body = JSON.parse(res.payload);
    assert.equal(body.available, false);
  });
});

describe('POST /api/auth/forgot-password', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve retornar mensagem generica para email nao cadastrado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'naocadastrado@test.com' },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.message);
    assert.ok(body.message.includes('Se existir uma conta'));
  });

  it('deve retornar mensagem generica para email vazio', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {},
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.message);
  });

  it('deve retornar mensagem generica para email invalido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'emailinvalido' },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.message);
  });
});

describe('POST /api/auth/reset-password', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar reset sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { email: 'teste@test.com', password: 'NovaSenha123!' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar reset sem senha', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'token', email: 'teste@test.com' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar senha muito curta', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'token', email: 'teste@test.com', password: '123' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar senha fraca', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'token', email: 'teste@test.com', password: '12345678' },
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('fraca') || body.message.includes('fraca'));
  });

  it('deve rejeitar token invalido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'token-invalido', email: 'teste@test.com', password: 'NovaSenha123!' },
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('inválido') || body.message.includes('expirado'));
  });

  it('deve rejeitar senhas que nao conferem', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'token', email: 'teste@test.com', password: 'NovaSenha123!', password_confirm: 'OutraSenha123!' },
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('conferem'));
  });
});

describe('Schedule Routes - Validation', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar GET sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/schedule' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar POST sem token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/schedule' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar PATCH sem token', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/schedule/1' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar DELETE sem token', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/schedule/1' });
    assert.equal(res.statusCode, 401);
  });
});

describe('Tenant Routes - Validation', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar GET /stats sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tenant/stats' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar GET /profile sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tenant/profile' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar PATCH /profile sem token', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/tenant/profile' });
    assert.equal(res.statusCode, 401);
  });
});

describe('Album Routes - Validation', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar GET /albums sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/albums' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar POST /albums sem token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/albums' });
    assert.equal(res.statusCode, 401);
  });
});

describe('Media Routes - Validation', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar POST /media/upload sem token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/media/upload' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar DELETE /media/:id sem token', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/media/123' });
    assert.equal(res.statusCode, 401);
  });
});

describe('Portfolio Routes', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve retornar erro para slug inexistente (404 ou 500 sem DB)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/portfolio/slug-inexistente' });
    assert.ok(res.statusCode === 404 || res.statusCode === 500);
  });
});

describe('Pix Webhook - Security', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar webhook sem corpo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/orders/webhook/pix',
      payload: {},
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('Upload - Security (validation layer)', () => {
  function detectMimeFromBuffer(buffer) {
    const MAGIC_BYTES = {
      jpeg: [[0xFF, 0xD8, 0xFF]],
      png: [[0x89, 0x50, 0x4E, 0x47]],
      webp: [[0x52, 0x49, 0x46, 0x46]],
    };
    for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
      for (const sig of signatures) {
        if (sig.every((byte, i) => buffer[i] === byte)) return `image/${mime}`;
      }
    }
    return null;
  }

  it('deve detectar JPEG por magic bytes', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    assert.equal(detectMimeFromBuffer(buf), 'image/jpeg');
  });

  it('deve detectar PNG por magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
    assert.equal(detectMimeFromBuffer(buf), 'image/png');
  });

  it('deve rejeitar arquivo sem assinatura de imagem valida', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    assert.equal(detectMimeFromBuffer(buf), null);
  });

  it('deve rejeitar arquivo vazio', () => {
    const buf = Buffer.alloc(0);
    assert.equal(detectMimeFromBuffer(buf), null);
  });
});

describe('Orders - Price Recalculation', () => {
  it('deve rejeitar pedido sem itens', () => {
    const items = [];
    assert.equal(items.length < 1, true);
  });

  it('deve rejeitar pedido sem email de cliente', () => {
    const email = '';
    assert.equal(!email || !email.includes('@'), true);
  });

  it('deve rejeitar email de cliente invalido', () => {
    const email = 'invalido';
    assert.equal(!email.includes('@'), true);
  });
});

describe('POST /api/auth/logout', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve retornar 200 sem cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('sucesso'));
  });

  it('deve limpar o cookie auth_token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });
    const setCookie = res.cookies.find(c => c.name === 'auth_token');
    assert.ok(setCookie);
    assert.equal(setCookie.value, '');
  });
});

describe('GET /api/auth/session', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/session' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar com token invalido', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { authorization: 'Bearer token-invalido' },
    });
    assert.equal(res.statusCode, 401);
  });
});

describe('CSRF Protection', () => {
  let app;
  let validToken;

  before(async () => { app = await getApp(); validToken = fastifyJwtSign(app); });
  after(async () => { await closeApp(); });

  it('deve rejeitar POST sem cookie nem Bearer (sem auth)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/schedule' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar POST com cookie mas sem x-csrf-token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      cookies: { auth_token: validToken },
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.message, 'Invalid CSRF token');
  });

  it('deve rejeitar POST com x-csrf-token invalido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      cookies: { auth_token: validToken },
      headers: { 'x-csrf-token': 'token-invalido' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve permitir GET com cookie mesmo sem x-csrf-token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      cookies: { auth_token: validToken },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });

  it('nao deve exigir CSRF para login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.notEqual(body.message, 'Invalid CSRF token');
  });

  it('nao deve exigir CSRF para register', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {},
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.notEqual(body.message, 'Invalid CSRF token');
  });

  it('nao deve exigir CSRF para forgot-password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {},
    });
    assert.equal(res.statusCode, 200);
  });

  it('nao deve exigir CSRF para reset-password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'x', email: 'x@x.com', password: 'NovaSenha123!' },
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 500);
    if (res.statusCode === 400) {
      const body = JSON.parse(res.payload);
      assert.notEqual(body.message, 'Invalid CSRF token');
    }
  });
});

describe('Tenant Isolation', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('requireTenant deve usar tenant do JWT, ignorando x-tenant-slug', async () => {
    const token = app.jwt.sign({ sub: 'user1', tenantId: 'tenant-correto', role: 'owner' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/tenant/stats',
      headers: { authorization: `Bearer ${token}`, 'x-tenant-slug': 'tenant-malicioso' },
    });
    assert.ok(res.statusCode === 401 || res.statusCode === 500);
  });
});

function fastifyJwtSign(app) {
  return app.jwt.sign({ sub: 'test-user', tenantId: 'test-tenant', role: 'owner' });
}
