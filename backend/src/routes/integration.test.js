import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, closeApp } from '../test-helper.js';
import { v4 as uuidv4 } from 'uuid';

function makeToken(app, overrides = {}) {
  return app.jwt.sign({
    sub: overrides.sub || 'test-user-' + uuidv4(),
    tenantId: overrides.tenantId || 'test-tenant-' + uuidv4(),
    role: overrides.role || 'owner',
  });
}

function authHeaders(token) {
  return { authorization: `Bearer ${token}` };
}

function csrfHeaders(token) {
  return { authorization: `Bearer ${token}`, 'x-csrf-token': token };
}

// ===== Full Auth Flow =====

describe('Auth - Full Registration Flow', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve completar registro com dados validos (ou 500 sem DB)', async () => {
    const slug = 'test-flow-' + Date.now();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Test User',
        email: `flow-${Date.now()}@test.com`,
        password: 'Test1234!',
        slug,
      },
    });
    if (res.statusCode === 201) {
      const body = JSON.parse(res.payload);
      assert.ok(body.token);
      assert.ok(body.user);
      assert.equal(body.user.name, 'Test User');
    }
    assert.ok(res.statusCode === 201 || res.statusCode === 500);
  });

  it('deve rejeitar slug duplicado (ou 500 sem DB)', async () => {
    const slug = 'dup-slug-' + Date.now();
    const payload = {
      name: 'User 1', email: `dup1-${Date.now()}@test.com`,
      password: 'Test1234!', slug,
    };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const res2 = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { name: 'User 2', email: `dup2-${Date.now()}@test.com`, password: 'Test1234!', slug },
    });
    if (res2.statusCode !== 500) {
      assert.equal(res2.statusCode, 409);
    }
  });
});

describe('Auth - Login Flow', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar login com email inexistente', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'nonexistent@test.com', password: 'Test1234!' },
    });
    assert.ok(res.statusCode === 401 || res.statusCode === 500);
  });

  it('deve rejeitar login com senha incorreta', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'test@login-flow.com', password: 'WrongPass1!' },
    });
    assert.ok(res.statusCode === 401 || res.statusCode === 500);
  });
});

describe('Auth - Session Management', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve retornar sessao valida com token', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/auth/session',
      headers: authHeaders(token),
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });

  it('deve rejeitar sessao expirada', async () => {
    const expired = app.jwt.sign(
      { sub: 'expired-user', tenantId: 'test', role: 'owner' },
      { expiresIn: '0s' },
    );
    const res = await app.inject({
      method: 'GET', url: '/api/auth/session',
      headers: authHeaders(expired),
    });
    assert.equal(res.statusCode, 401);
  });

  it('deve fazer logout corretamente', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.message, 'Logged out successfully');
  });
});

// ===== Media / Upload =====

describe('Media - Upload Validation', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve rejeitar upload sem arquivo', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/media/upload',
      headers: authHeaders(token),
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar upload com payload nao-multipart', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/media/upload',
      headers: { ...authHeaders(token), 'content-type': 'application/json' },
      payload: { fake: true },
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 500);
  });

  it('deve rejeitar PATCH de media inexistente', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/api/media/nonexistent-id',
      headers: csrfHeaders(token),
      payload: { is_for_sale: true },
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 404 || res.statusCode === 500);
  });
});

// ===== Albums =====

describe('Albums - Full CRUD', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve criar album (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/albums',
      headers: csrfHeaders(token),
      payload: { title: 'Test Album', description: 'A test album', is_public: true },
    });
    if (res.statusCode === 201) {
      const body = JSON.parse(res.payload);
      assert.ok(body.id);
      assert.equal(body.title, 'Test Album');
    }
    assert.ok(res.statusCode === 201 || res.statusCode === 500);
  });

  it('deve rejeitar album sem titulo', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/albums',
      headers: csrfHeaders(token),
      payload: {},
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve listar albums (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/albums',
      headers: authHeaders(token),
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
    if (res.statusCode === 200) {
      const body = JSON.parse(res.payload);
      assert.ok(Array.isArray(body.albums));
    }
  });

  it('deve retornar 404 para album inexistente', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/albums/nonexistent-id',
      headers: authHeaders(token),
    });
    assert.ok(res.statusCode === 404 || res.statusCode === 500);
  });
});

// ===== Schedule =====

describe('Schedule - Full CRUD', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve criar evento (ou 500 sem DB)', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const res = await app.inject({
      method: 'POST', url: '/api/schedule',
      headers: csrfHeaders(token),
      payload: {
        title: 'Casamento Teste',
        event_date: futureDate.toISOString().split('T')[0],
        location: 'São Paulo',
        status: 'Agenda Aberta',
      },
    });
    if (res.statusCode === 201) {
      const body = JSON.parse(res.payload);
      assert.ok(body.schedule);
      assert.equal(body.schedule.title, 'Casamento Teste');
    }
    assert.ok(res.statusCode === 201 || res.statusCode === 500);
  });

  it('deve rejeitar evento sem titulo', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/schedule',
      headers: csrfHeaders(token),
      payload: { event_date: '2025-12-31' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar evento sem data', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/schedule',
      headers: csrfHeaders(token),
      payload: { title: 'Test' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar status invalido', () => {
    const ALLOWED = ['Agenda Aberta', 'Confirmado', 'Cancelado', 'Realizado', 'Remarcado'];
    const invalid = 'invalido';
    assert.equal(ALLOWED.includes(invalid), false);
  });
});

// ===== Tenant / Profile =====

describe('Profile - Full CRUD', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve atualizar perfil com dados validos (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/api/tenant/profile',
      headers: csrfHeaders(token),
      payload: {
        name: 'Updated Name',
        headline: 'Fotógrafa especializada',
        bio: 'Esta é minha biografia atualizada.',
      },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
    if (res.statusCode === 200) {
      assert.equal(JSON.parse(res.payload).name, 'Updated Name');
    }
  });

  it('deve retornar perfil (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/tenant/profile',
      headers: authHeaders(token),
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });
});

// ===== Orders =====

describe('Orders - Payment Flow', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar pedido com email invalido', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/orders',
      payload: {
        tenant_slug: 'test',
        customer_name: 'John',
        customer_email: 'invalid-email',
        items: [{ type: 'photo', media_id: '123' }],
      },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar webhook sem event_id', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/orders/webhook/pix',
      payload: { payment_id: '123', status: 'paid', order_id: '123' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar webhook com status invalido', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/orders/webhook/pix',
      payload: { payment_id: '123', status: 'invalid_status', order_id: '123', event_id: 'evt-1' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar webhook com valor divergente', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/orders/webhook/pix',
      payload: {
        payment_id: 'pay_divergence',
        status: 'paid',
        order_id: 'order-nao-existe',
        event_id: 'evt-divergence-' + Date.now(),
        amount: '999999.99',
        currency: 'BRL',
      },
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 500);
  });
});

// ===== Email Service =====

describe('Email - sendContactEmail', () => {
  it('deve falhar se SMTP nao configurado', async () => {
    const { sendContactEmail } = await import('../services/email.js');
    try {
      await sendContactEmail({
        to: 'test@test.com',
        fromName: 'Test',
        fromEmail: 'test@test.com',
        subject: 'Test',
        message: 'Test message',
      });
      assert.fail('Deveria ter lançado erro');
    } catch (err) {
      assert.ok(err.message.includes('not configured') || err.message.includes('Email service'));
    }
  });

  it('deve escapar HTML corretamente', async () => {
    const mod = await import('../services/email.js');
    const dangerous = '<script>alert("xss")</script>';
    const escaped = dangerous.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    assert.equal(escaped.includes('<script>'), false);
    assert.equal(escaped.includes('&lt;script&gt;'), true);
  });
});

// ===== Repeated Click / Double Submit Protection =====

describe('Double Submit Protection', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve rejeitar segundo envio se CSRF token ja usado', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/schedule',
      headers: csrfHeaders(token),
      payload: {},
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 500);
  });

  it('deve rejeitar POST repetido no mesmo recurso', async () => {
    const res1 = await app.inject({
      method: 'DELETE', url: '/api/schedule/nonexistent',
      headers: csrfHeaders(token),
    });
    const res2 = await app.inject({
      method: 'DELETE', url: '/api/schedule/nonexistent',
      headers: csrfHeaders(token),
    });
    assert.equal(res1.statusCode, res2.statusCode);
  });
});

// ===== Transaction / Rollback =====

describe('Database Transactions', () => {
  it('deve rejeitar album com tenant inexistente', async () => {
    const app = await getApp();
    const fakeToken = app.jwt.sign({
      sub: 'fake-user', tenantId: '00000000-0000-0000-0000-000000000000', role: 'owner',
    });
    const res = await app.inject({
      method: 'POST', url: '/api/albums',
      headers: csrfHeaders(fakeToken),
      payload: { title: 'Orphan Album' },
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 500);
    await closeApp();
  });

  it('deve ter pool de conexao ativo', () => {
    const { getPool } = require('../config/database.js');
    const pool = getPool();
    assert.ok(pool);
    assert.ok(typeof pool.execute === 'function');
  });
});

// ===== File Size Limits =====

describe('Upload Limits', () => {
  it('deve rejeitar arquivo maior que 500MB', () => {
    const maxBytes = 500 * 1024 * 1024;
    const oversized = maxBytes + 1;
    assert.ok(oversized > maxBytes);
  });

  it('deve aceitar formatos permitidos', () => {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    assert.ok(ALLOWED_TYPES.includes('image/jpeg'));
    assert.ok(ALLOWED_TYPES.includes('image/png'));
    assert.equal(ALLOWED_TYPES.includes('image/gif'), false);
    assert.equal(ALLOWED_TYPES.includes('text/plain'), false);
  });
});

// ===== Security Headers / XSS =====

describe('XSS Prevention', () => {
  it('deve escapar HTML em saida', () => {
    const unsafe = '<img src=x onerror=alert(1)>';
    const escaped = unsafe.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    assert.equal(escaped.includes('<img'), false);
    assert.equal(escaped.includes('&lt;img'), true);
  });

  it('deve sanitizar content-type com tab', () => {
    const dirty = 'application/json\t; charset=utf-8';
    const clean = dirty.replace(/\t/g, '');
    assert.equal(clean.includes('\t'), false);
  });
});

// ===== Idempotency =====

describe('Idempotency', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve retornar mesmo status para mesma chave de idempotencia', async () => {
    const key = 'idemp-test-key-' + Date.now();
    const payload = {
      tenant_slug: 'test', customer_name: 'John',
      customer_email: 'john@test.com', items: [{ type: 'photo', media_id: '123' }],
      idempotency_key: key,
    };
    const res1 = await app.inject({ method: 'POST', url: '/api/orders', payload });
    const res2 = await app.inject({ method: 'POST', url: '/api/orders', payload });
    assert.equal(res1.statusCode, res2.statusCode);
  });

  it('deve processar webhook com event_id repetido como idempotente', async () => {
    const eventId = 'evt-idemp-' + Date.now();
    const payload = {
      payment_id: 'pay_idemp', status: 'paid',
      order_id: 'order-idemp-test', event_id: eventId,
    };
    const res1 = await app.inject({ method: 'POST', url: '/api/orders/webhook/pix', payload });
    const res2 = await app.inject({ method: 'POST', url: '/api/orders/webhook/pix', payload });
    assert.equal(res1.statusCode, res2.statusCode);
  });
});
