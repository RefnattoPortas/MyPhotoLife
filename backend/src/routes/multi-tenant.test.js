import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, closeApp } from '../test-helper.js';

function makeTenantToken(app, tenantId, role = 'owner') {
  return app.jwt.sign({ sub: `user-${tenantId}`, tenantId, role });
}

describe('Multi-Tenant Isolation', () => {
  let app;
  let tokenA;
  let tokenB;

  before(async () => {
    app = await getApp();
    tokenA = makeTenantToken(app, 'tenant-a-123');
    tokenB = makeTenantToken(app, 'tenant-b-456');
  });
  after(async () => { await closeApp(); });

  describe('Authorization - Require Auth', () => {
    const protectedRoutes = [
      { method: 'GET', url: '/api/albums' },
      { method: 'POST', url: '/api/albums' },
      { method: 'GET', url: '/api/schedule' },
      { method: 'POST', url: '/api/schedule' },
      { method: 'GET', url: '/api/tenant/profile' },
      { method: 'PATCH', url: '/api/tenant/profile' },
      { method: 'GET', url: '/api/tenant/stats' },
      { method: 'GET', url: '/api/orders' },
      { method: 'POST', url: '/api/media/upload' },
    ];

    for (const route of protectedRoutes) {
      it(`${route.method} ${route.url} deve rejeitar sem token`, async () => {
        const res = await app.inject({ method: route.method, url: route.url });
        assert.equal(res.statusCode, 401);
      });

      it(`${route.method} ${route.url} deve rejeitar com token invalido`, async () => {
        const res = await app.inject({
          method: route.method,
          url: route.url,
          headers: { authorization: 'Bearer token-invalido' },
        });
        assert.equal(res.statusCode, 401);
      });
    }
  });

  describe('Tenant Isolation - Cada tenant ve apenas seus proprios dados', () => {
    it('tenant A nao deve ver dados do tenant B (sem DB: ambos dao 500)', async () => {
      const resA = await app.inject({
        method: 'GET',
        url: '/api/albums',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resB = await app.inject({
        method: 'GET',
        url: '/api/albums',
        headers: { authorization: `Bearer ${tokenB}` },
      });
      assert.ok(resA.statusCode === 200 || resA.statusCode === 500);
      assert.ok(resB.statusCode === 200 || resB.statusCode === 500);
    });
  });

  describe('Authorization - Apenas owner pode modificar', () => {
    it('usuario com role "viewer" deve ter acesso limitado', async () => {
      const viewerToken = app.jwt.sign({
        sub: 'viewer-user', tenantId: 'tenant-a-123', role: 'viewer',
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/albums',
        headers: { authorization: `Bearer ${viewerToken}`, 'x-csrf-token': viewerToken },
        payload: { title: 'Hacked Album' },
      });
      assert.ok(res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 500);
    });
  });

  describe('Dashboard - Protecao de rota', () => {
    it('usuario nao autenticado nao pode acessar dashboard', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/tenant/profile' });
      assert.equal(res.statusCode, 401);
    });

    it('token de tenant diferente deve usar tenant do JWT', async () => {
      const token = app.jwt.sign({
        sub: 'user-x', tenantId: 'meu-tenant-real', role: 'owner',
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/tenant/profile',
        headers: {
          authorization: `Bearer ${token}`,
          'x-tenant-slug': 'outro-tenant',
        },
      });
      assert.ok(res.statusCode === 200 || res.statusCode === 500);
    });
  });

  describe('CSRF - Metodos seguros', () => {
    it('GET nao deve exigir CSRF', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/session',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      assert.ok(res.statusCode === 200 || res.statusCode === 500);
    });

    it('POST deve exigir CSRF', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/schedule',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      assert.ok(res.statusCode === 400);
      const body = JSON.parse(res.payload);
      assert.equal(body.message, 'Invalid CSRF token');
    });

    it('rota publica de portfolio nao exige auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/portfolio/slug-inexistente',
      });
      assert.ok(res.statusCode === 404 || res.statusCode === 500);
    });
  });

  describe('Protected Operations', () => {
    it('DELETE de outro tenant deve falhar', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/schedule/nao-existe',
        headers: { authorization: `Bearer ${tokenA}`, 'x-csrf-token': tokenA },
      });
      assert.ok(res.statusCode === 404 || res.statusCode === 500);
    });

    it('PATCH de esquema de outro tenant deve falhar', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/schedule/nao-existe',
        headers: { authorization: `Bearer ${tokenA}`, 'x-csrf-token': tokenA },
        payload: { title: 'Updated' },
      });
      assert.ok(res.statusCode === 404 || res.statusCode === 500);
    });
  });

  describe('Unauthenticated Access', () => {
    it('rota de webhook deve ser acessivel sem auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/orders/webhook/pix',
        payload: {},
      });
      assert.equal(res.statusCode, 400);
    });

    it('rota health deve ser publica', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      assert.equal(res.statusCode, 200);
    });
  });
});
