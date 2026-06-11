import { getPool } from '../config/database.js';

export default async function tenantRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireTenant);

  // GET /stats — Overview do dashboard
  fastify.get('/stats', async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [[{ albumCount }]] = await pool.execute(
      'SELECT COUNT(*) AS albumCount FROM albums WHERE tenant_id = ?',
      [tenantId],
    );

    const [[{ mediaCount }]] = await pool.execute(
      'SELECT COUNT(*) AS mediaCount FROM media_files WHERE tenant_id = ?',
      [tenantId],
    );

    const [[{ orderCount }]] = await pool.execute(
      'SELECT COUNT(*) AS orderCount FROM orders WHERE tenant_id = ?',
      [tenantId],
    );

    const [[{ revenue }]] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE tenant_id = ? AND status = ?',
      [tenantId, 'paid'],
    );

    return { stats: { albumCount, mediaCount, orderCount, revenue: parseFloat(revenue) } };
  });

  // PATCH /profile — Atualizar perfil (bio, pix, nome…)
  fastify.patch('/profile', async (request, reply) => {
    const tenantId = request.tenantId;
    const { name, bio, pix_key, pix_key_type } = request.body || {};
    const pool = getPool();

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (pix_key !== undefined) { updates.push('pix_key = ?'); params.push(pix_key); }
    if (pix_key_type !== undefined) { updates.push('pix_key_type = ?'); params.push(pix_key_type); }

    if (updates.length > 0) {
      params.push(tenantId);
      await pool.execute(
        `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );
    }

    reply.status(200).send({ updated: true });
  });

  // GET /profile — Dados do perfil
  fastify.get('/profile', async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT id, name, email, slug, bio, pix_key, pix_key_type, storage_quota, storage_used, created_at FROM tenants WHERE id = ? LIMIT 1',
      [tenantId],
    );

    return { tenant: rows[0] || null };
  });
}
