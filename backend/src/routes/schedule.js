import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';

const ALLOWED_STATUSES = ['Agenda Aberta', 'Confirmado', 'Cancelado', 'Realizado', 'Remarcado'];
const TITLE_MAX = 255;
const LOCATION_MAX = 255;

function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return null;
  const normalized = ALLOWED_STATUSES.find(
    (s) => s.toLowerCase() === status.trim().toLowerCase(),
  );
  return normalized || null;
}

function validateEvent(body) {
  const errors = [];

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push('Título é obrigatório');
    } else if (body.title.trim().length > TITLE_MAX) {
      errors.push(`Título deve ter no máximo ${TITLE_MAX} caracteres`);
    }
  }

  if (body.event_date !== undefined) {
    if (!body.event_date) {
      errors.push('Data é obrigatória');
    } else {
      const d = new Date(body.event_date);
      if (isNaN(d.getTime())) {
        errors.push('Data inválida');
      }
    }
  }

  if (body.location !== undefined && body.location !== null) {
    if (typeof body.location !== 'string') {
      errors.push('Local deve ser texto');
    } else if (body.location.length > LOCATION_MAX) {
      errors.push(`Local deve ter no máximo ${LOCATION_MAX} caracteres`);
    }
  }

  if (body.status !== undefined && body.status !== null) {
    if (!normalizeStatus(body.status)) {
      errors.push(`Status inválido. Permitidos: ${ALLOWED_STATUSES.join(', ')}`);
    }
  }

  return errors;
}

export default async function scheduleRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireTenant);

  fastify.get('/', async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
       `SELECT id, title, event_date, location, status, updated_at
        FROM schedule WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY event_date ASC`,
      [tenantId],
    );

    return { schedule: rows };
  });

  fastify.post('/', async (request, reply) => {
    const tenantId = request.tenantId;
    const { title, event_date, location, status } = request.body || {};

    const errors = validateEvent({ title, event_date, location, status });
    if (!title) errors.push('Título é obrigatório');
    if (!event_date) errors.push('Data é obrigatória');
    if (errors.length > 0) throw badRequest(errors.join('. '));

    const normalizedStatus = normalizeStatus(status) || 'Agenda Aberta';
    const id = uuidv4();
    const pool = getPool();

    await pool.execute(
      `INSERT INTO schedule (id, tenant_id, title, event_date, location, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tenantId, title.trim(), event_date, location?.trim() || null, normalizedStatus],
    );

    const [rows] = await pool.execute(
      `SELECT id, title, event_date, location, status, created_at, updated_at
       FROM schedule WHERE id = ? LIMIT 1`,
      [id],
    );

    reply.status(201).send({ schedule: rows[0] });
  });

  fastify.patch('/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params;
    const body = request.body || {};

    const errors = validateEvent(body);
    if (errors.length > 0) throw badRequest(errors.join('. '));

    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM schedule WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, tenantId],
    );
    if (existing.length === 0) throw notFound('Evento não encontrado');

    const updates = [];
    const params = [];

    if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title.trim()); }
    if (body.event_date !== undefined) { updates.push('event_date = ?'); params.push(body.event_date); }
    if (body.location !== undefined) { updates.push('location = ?'); params.push(body.location?.trim() || null); }
    if (body.status !== undefined) { updates.push('status = ?'); params.push(normalizeStatus(body.status)); }

    if (updates.length === 0) {
      return reply.status(200).send({ updated: false });
    }

    params.push(id, tenantId);
    const [result] = await pool.execute(
      `UPDATE schedule SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      params,
    );

    if (result.affectedRows === 0) throw notFound('Evento não encontrado');

    const [rows] = await pool.execute(
      `SELECT id, title, event_date, location, status, updated_at
       FROM schedule WHERE id = ? LIMIT 1`,
      [id],
    );

    reply.status(200).send({ schedule: rows[0] });
  });

  fastify.delete('/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.id || null;
    const { id } = request.params;

    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id, title FROM schedule WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, tenantId],
    );
    if (existing.length === 0) throw notFound('Evento não encontrado');

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE schedule SET deleted_at = ?, deleted_by = ? WHERE id = ? AND tenant_id = ?',
      [now, userId, id, tenantId],
    );

    const auditId = uuidv4();
    await pool.execute(
      `INSERT INTO audit_log (id, tenant_id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, 'delete', 'schedule', ?, ?)`,
      [auditId, tenantId, userId, id, JSON.stringify({ title: existing[0].title })],
    );

    reply.status(200).send({ deleted: true, event: existing[0].title });
  });
}
