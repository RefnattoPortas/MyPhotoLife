import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';
import { generateSignedUrl } from '../services/storage.js';
import { notFound, badRequest, unauthorized } from '../utils/errors.js';

export default async function orderRoutes(fastify) {
  // POST / — Criar pedido (rota pública, sem autenticação)
  fastify.post('/', async (request, reply) => {
    const { tenant_slug, customer_name, customer_email, customer_phone, items } = request.body || {};

    if (!tenant_slug || !customer_name || !customer_email || !items?.length) {
      throw badRequest('tenant_slug, customer_name, customer_email and items are required');
    }

    const pool = getPool();

    const [tenants] = await pool.execute(
      'SELECT id, pix_key, pix_key_type FROM tenants WHERE slug = ? AND is_active = TRUE LIMIT 1',
      [tenant_slug],
    );
    if (tenants.length === 0) throw notFound('Photographer not found');

    const tenantId = tenants[0].id;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (item.type === 'photo' && item.media_id) {
        const [media] = await pool.execute(
          'SELECT id, filename, price FROM media_files WHERE id = ? AND tenant_id = ? AND is_for_sale = TRUE LIMIT 1',
          [item.media_id, tenantId],
        );
        if (media.length === 0) throw notFound(`Media ${item.media_id} not available for sale`);
        totalAmount += parseFloat(media[0].price);
        orderItems.push({ type: 'photo', mediaId: media[0].id, title: media[0].filename, price: media[0].price });
      } else if (item.type === 'album' && item.album_id) {
        const [album] = await pool.execute(
          'SELECT id, title, price FROM albums WHERE id = ? AND tenant_id = ? AND is_for_sale = TRUE LIMIT 1',
          [item.album_id, tenantId],
        );
        if (album.length === 0) throw notFound(`Album ${item.album_id} not available for sale`);
        totalAmount += parseFloat(album[0].price);
        orderItems.push({ type: 'album', albumId: album[0].id, title: album[0].title, price: album[0].price });
      }
    }

    if (orderItems.length === 0) throw badRequest('No valid items to purchase');

    const orderId = uuidv4();

    await pool.execute(
      `INSERT INTO orders (id, tenant_id, customer_name, customer_email, customer_phone, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [orderId, tenantId, customer_name, customer_email, customer_phone || null, totalAmount],
    );

    for (const item of orderItems) {
      await pool.execute(
        `INSERT INTO order_items (id, order_id, media_file_id, album_id, item_type, title, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [uuidv4(), orderId, item.mediaId || null, item.albumId || null,
         item.type, item.title, item.price, item.price],
      );
    }

    // TODO: Integrar com gateway de Pix para gerar QR Code
    // Por enquanto, retorna placeholder
    reply.status(201).send({
      id: orderId,
      total_amount: totalAmount,
      status: 'pending',
      pix_qrcode: null,
      pix_copy_paste: null,
    });
  });

  // GET /:id — Status do pedido (público)
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const pool = getPool();

    const [orders] = await pool.execute(
      'SELECT id, total_amount, status, pix_qrcode, pix_copy_paste, pix_expires_at, created_at FROM orders WHERE id = ? LIMIT 1',
      [id],
    );
    if (orders.length === 0) throw notFound('Order not found');

    return { order: orders[0] };
  });

  // GET /:id/download — Gerar links de download (após pagamento)
  fastify.get('/:id/download', async (request, reply) => {
    const { id } = request.params;
    const { email } = request.query;
    const pool = getPool();

    const [orders] = await pool.execute(
      'SELECT id, tenant_id, customer_email, status FROM orders WHERE id = ? LIMIT 1',
      [id],
    );
    if (orders.length === 0) throw notFound('Order not found');

    const order = orders[0];
    if (order.status !== 'paid') throw unauthorized('Order is not paid yet');
    if (order.customer_email !== email) throw unauthorized('Email does not match order');

    const [items] = await pool.execute(
      'SELECT item_type, media_file_id, album_id FROM order_items WHERE order_id = ?',
      [id],
    );

    const downloadLinks = [];

    for (const item of items) {
      if (item.item_type === 'photo' && item.media_file_id) {
        const [media] = await pool.execute(
          'SELECT original_path, filename FROM media_files WHERE id = ?',
          [item.media_file_id],
        );
        if (media.length > 0) {
          const url = await generateSignedUrl(media[0].original_path, 3600);
          downloadLinks.push({ filename: media[0].filename, url, expires_in: 3600 });
        }
      } else if (item.item_type === 'album' && item.album_id) {
        const [mediaFiles] = await pool.execute(
          'SELECT original_path, filename FROM media_files WHERE album_id = ?',
          [item.album_id],
        );
        for (const mf of mediaFiles) {
          const url = await generateSignedUrl(mf.original_path, 3600);
          downloadLinks.push({ filename: mf.filename, url, expires_in: 3600 });
        }
      }
    }

    return { order_id: id, download_links: downloadLinks };
  });

  // Webhook: POST /webhook/pix — Atualizar status do pedido
  fastify.post('/webhook/pix', async (request, reply) => {
    const { payment_id, status, order_id } = request.body || {};

    if (!payment_id || !status || !order_id) {
      throw badRequest('payment_id, status and order_id are required');
    }

    const pool = getPool();

    const [orders] = await pool.execute('SELECT id, status FROM orders WHERE id = ? LIMIT 1', [order_id]);
    if (orders.length === 0) throw notFound('Order not found');

    const newStatus = status === 'paid' ? 'paid' : status === 'expired' ? 'expired' : 'cancelled';

    await pool.execute(
      'UPDATE orders SET status = ?, gateway_payment_id = ?, paid_at = IF(? = "paid", NOW(), NULL) WHERE id = ?',
      [newStatus, payment_id, newStatus, order_id],
    );

    reply.status(200).send({ received: true });
  });

  // GET / (autenticado) — Listar pedidos do tenant
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.requireTenant] }, async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT id, customer_name, customer_email, total_amount, status, created_at, paid_at FROM orders WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId],
    );

    return { orders: rows };
  });
}
