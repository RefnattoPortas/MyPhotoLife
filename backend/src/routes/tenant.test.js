import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, closeApp } from '../test-helper.js';

function makeToken(app, tenantId = 'test-tenant') {
  return app.jwt.sign({ sub: 'test-user', tenantId, role: 'owner' });
}

describe('Tenant - Profile Auth', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar GET /profile sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tenant/profile' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar PATCH /profile sem token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      payload: { name: 'Teste' },
    });
    assert.equal(res.statusCode, 401);
  });
});

describe('Tenant - Profile Validation', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve rejeitar nome muito curto', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'A' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar nome muito longo', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'A'.repeat(101) },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar bio muito longa', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { bio: 'x'.repeat(501) },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar headline muito longa', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { headline: 'x'.repeat(256) },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar telefone invalido', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { phone: 'abc' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar whatsapp invalido', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { whatsapp: 'abc' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar URL de rede social sem HTTPS', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { instagram: 'http://instagram.com/teste' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar URL com protocolo javascript:', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { instagram: 'javascript:alert(1)' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve aceitar URL HTTPS valida', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { instagram: 'https://instagram.com/fotografo' },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });

  it('deve aceitar limpar campo opcional com string vazia', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { instagram: '' },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });
});

describe('Tenant - Theme Validation', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve rejeitar fonte nao permitida', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { theme_config: { font: 'Comic Sans' } },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve aceitar fonte permitida', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { theme_config: { font: 'Inter' } },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });

  it('deve rejeitar cor em formato invalido', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { theme_config: { primary_color: 'red' } },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve aceitar cor hexadecimal valida', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { theme_config: { primary_color: '#FF5733' } },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });

  it('deve aceitar hex abreviado', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { theme_config: { secondary_color: '#fff' } },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });
});

describe('Tenant - Profile GET', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve retornar dados do perfil (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/tenant/profile',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
  });
});

describe('Tenant - Stats', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve rejeitar stats sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tenant/stats' });
    assert.equal(res.statusCode, 401);
  });

  it('deve retornar stats (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/tenant/stats',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
    if (res.statusCode === 200) {
      const body = JSON.parse(res.payload);
      assert.ok('stats' in body);
      assert.ok('albumCount' in body.stats);
      assert.ok('mediaCount' in body.stats);
    }
  });
});
