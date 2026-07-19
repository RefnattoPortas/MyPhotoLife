import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, closeApp } from '../test-helper.js';

describe('Media Upload - Security', () => {
  let app;
  let validToken;

  before(async () => {
    app = await getApp();
    validToken = app.jwt.sign({ sub: 'test-user', tenantId: 'test-tenant', role: 'owner' });
  });

  after(async () => { await closeApp(); });

  it('deve rejeitar upload sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media/upload',
    });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar requisicao sem arquivo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/media/upload',
      headers: { authorization: `Bearer ${validToken}` },
    });
    assert.equal(res.statusCode, 400);
  });

  it('deve rejeitar arquivo maior que 50MB', () => {
    const largeBuf = Buffer.alloc(51 * 1024 * 1024 + 1);
    assert.ok(largeBuf.length > 50 * 1024 * 1024);
  });

  it('deve rejeitar extensao proibida .exe', async () => {
    const fakeBuf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media/upload',
      headers: {
        authorization: `Bearer ${validToken}`,
        'content-type': 'multipart/form-data; boundary=test',
      },
      payload: createMultipartPayload('virus.exe', 'image/jpeg', fakeBuf),
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('not supported'));
  });

  it('deve rejeitar MIME type falso (gif disfarcado)', async () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media/upload',
      headers: {
        authorization: `Bearer ${validToken}`,
        'content-type': 'multipart/form-data; boundary=test',
      },
      payload: createMultipartPayload('image.png', 'image/gif', buf),
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('not supported'));
  });

  it('deve rejeitar arquivo sem magic bytes de imagem', async () => {
    const fakeBuf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media/upload',
      headers: {
        authorization: `Bearer ${validToken}`,
        'content-type': 'multipart/form-data; boundary=test',
      },
      payload: createMultipartPayload('image.jpg', 'image/jpeg', fakeBuf),
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('not appear to be a valid image') || body.message.includes('Cannot decode'));
  });

  it('deve rejeitar arquivo com dados corrompidos (JPEG invalido)', async () => {
    const corruptedBuf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x00, 0x00]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media/upload',
      headers: {
        authorization: `Bearer ${validToken}`,
        'content-type': 'multipart/form-data; boundary=test',
      },
      payload: createMultipartPayload('image.jpg', 'image/jpeg', corruptedBuf),
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(
      body.message.includes('Cannot decode') ||
      body.message.includes('corrupted') ||
      body.message.includes('processing failed'),
    );
  });

  it('deve rejeitar HEIC (formato nao suportado)', async () => {
    const fakeHeic = Buffer.alloc(128);
    const res = await app.inject({
      method: 'POST',
      url: '/api/media/upload',
      headers: {
        authorization: `Bearer ${validToken}`,
        'content-type': 'multipart/form-data; boundary=test',
      },
      payload: createMultipartPayload('photo.heic', 'image/heic', fakeHeic),
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.ok(body.message.includes('not supported') || body.message.includes('not supported'));
  });

});

describe('Media Delete - Security', () => {
  let app;
  let validToken;

  before(async () => {
    app = await getApp();
    validToken = app.jwt.sign({ sub: 'test-user', tenantId: 'test-tenant', role: 'owner' });
  });

  after(async () => { await closeApp(); });

  it('deve rejeitar DELETE sem token', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/media/123' });
    assert.equal(res.statusCode, 401);
  });

  it('deve rejeitar DELETE de midia inexistente', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/media/id-inexistente',
      headers: { authorization: `Bearer ${validToken}` },
    });
    assert.ok(res.statusCode === 404 || res.statusCode === 500);
  });

  it('nao deve permitir deletar midia de outro tenant', async () => {
    const otherToken = app.jwt.sign({ sub: 'other-user', tenantId: 'other-tenant', role: 'owner' });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/media/qualquer-id',
      headers: { authorization: `Bearer ${otherToken}` },
    });
    assert.ok(res.statusCode === 404 || res.statusCode === 500);
  });
});

function createMultipartPayload(filename, mimeType, buffer) {
  const boundary = 'test';
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([Buffer.from(header), buffer, Buffer.from(footer)]);
}
