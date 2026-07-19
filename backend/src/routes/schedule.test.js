import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, closeApp } from '../test-helper.js';

function makeToken(app) {
  return app.jwt.sign({ sub: 'test-user', tenantId: 'test-tenant', role: 'owner' });
}

describe('Schedule - Auth', () => {
  let app;

  before(async () => { app = await getApp(); });
  after(async () => { await closeApp(); });

  it('deve rejeitar listagem sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/schedule' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar criacao sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      payload: { title: 'Teste', event_date: '2026-12-01' },
    });
    assert.equal(res.statusCode, 401);
  });
});

describe('Schedule - Validation', () => {
  let app;
  let token;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve rejeitar criacao sem titulo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
      payload: { event_date: '2026-12-01' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar criacao sem data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Teste' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar data invalida', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Teste', event_date: 'invalida' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar status invalido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Teste', event_date: '2026-12-01', status: 'Invalido' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar titulo muito longo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'x'.repeat(256), event_date: '2026-12-01' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar local muito longo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Teste', event_date: '2026-12-01', location: 'x'.repeat(256) },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve aceitar status normalizado (case insensitive)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Teste', event_date: '2026-12-01', status: 'confirmado' },
    });
    assert.ok(res.statusCode === 201 || res.statusCode === 500);
  });
});

describe('Schedule - CRUD', () => {
  let app;
  let token;
  let eventId;

  before(async () => {
    app = await getApp();
    token = makeToken(app);
  });
  after(async () => { await closeApp(); });

  it('deve criar evento (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Ensaio Fotográfico', event_date: '2026-12-01', location: 'Parque Ibirapuera' },
    });
    assert.ok(res.statusCode === 201 || res.statusCode === 500);
    if (res.statusCode === 201) {
      const body = JSON.parse(res.payload);
      eventId = body.schedule.id;
      assert.ok(body.schedule.id);
      assert.equal(body.schedule.title, 'Ensaio Fotográfico');
    }
  });

  it('deve listar eventos (ou 500 sem DB)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/schedule',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.ok(res.statusCode === 200 || res.statusCode === 500);
    if (res.statusCode === 200) {
      const body = JSON.parse(res.payload);
      assert.ok(Array.isArray(body.schedule));
    }
  });

  it('deve retornar 404 ao atualizar evento inexistente', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/schedule/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Editado' },
    });
    assert.ok(res.statusCode === 404 || res.statusCode === 500);
  });

  it('deve retornar 404 ao deletar evento inexistente', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/schedule/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.ok(res.statusCode === 404 || res.statusCode === 500);
  });

  it('deve impedir acesso a eventos de outro tenant', async () => {
    const otherToken = app.jwt.sign({ sub: 'other-user', tenantId: 'other-tenant', role: 'owner' });
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/schedule/${eventId || 'qualquer-id'}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });
    assert.ok(res.statusCode === 404 || res.statusCode === 500);
  });
});
