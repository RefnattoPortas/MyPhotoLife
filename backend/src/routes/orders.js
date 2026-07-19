import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getPool } from '../config/database.js';
import { generateSignedUrl } from '../services/storage.js';
import { notFound, badRequest, unauthorized } from '../utils/errors.js';
import { env } from '../config/index.js';

const VALID_TRANSITIONS = {
  pending: ['paid', 'expired', 'cancelled'],
  paid: ['refunded'],
  expired: [],
  cancelled: [],
};

function safeCompare(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export default async function orderRoutes(fastify) {
  // POST / — Criar pedido (rota pública, sem autenticação)
  fastify.post('/', async (request, _reply) => {
    const { tenant_slug, customer_name, customer_email, customer_phone, items } = request.body || {};

    if (!tenant_slug || !customer_name || !customer_email || !items?.length) {
      throw badRequest('tenant_slug, customer_name, customer_email e items sao obrigatorios');
    }

    if (!customer_email.includes('@')) {
      throw badRequest('Email do cliente invalido');
    }

    const pool = getPool();

    const [tenants] = await pool.execute(
      'SELECT id, pix_key, pix_key_type FROM tenants WHERE slug = ? AND is_active = TRUE LIMIT 1',
      [tenant_slug],
    );
    if (tenants.length === 0) throw notFound('Fotografo nao encontrado');

    const tenantId = tenants[0].id;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (item.type === 'photo' && item.media_id) {
        const [media] = await pool.execute(
          'SELECT id, filename, price FROM media_files WHERE id = ? AND tenant_id = ? AND is_for_sale = TRUE LIMIT 1',
          [item.media_id, tenantId],
        );
        if (media.length === 0) throw notFound(`Midia ${item.media_id} nao disponivel para venda`);
        totalAmount += parseFloat(media[0].price);
        orderItems.push({ type: 'photo', mediaId: media[0].id, title: media[0].filename, price: media[0].price });
      } else if (item.type === 'album' && item.album_id) {
        const [album] = await pool.execute(
          'SELECT id, title, price FROM albums WHERE id = ? AND tenant_id = ? AND is_for_sale = TRUE LIMIT 1',
          [item.album_id, tenantId],
        );
        if (album.length === 0) throw notFound(`Album ${item.album_id} nao disponivel para venda`);
        totalAmount += parseFloat(album[0].price);
        orderItems.push({ type: 'album', albumId: album[0].id, title: album[0].title, price: album[0].price });
      }
    }

    if (orderItems.length === 0) throw badRequest('Nenhum item valido para compra');

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

    // Gerar QR Code Pix (placeholder - substituir por integracao real)
    let pixQrcode = null;
    let pixCopyPaste = null;
    let pixExpiresAt = null;

    if (env.pix.gatewayUrl && env.pix.gatewayApiKey) {
      try {
        const pixPayload = {
          amount: totalAmount,
          order_id: orderId,
          customer: { name: customer_name, email: customer_email, phone: customer_phone },
          tenant_id: tenantId,
        };
        const pixResponse = await fetch(`${env.pix.gatewayUrl}/charge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.pix.gatewayApiKey}`,
          },
          body: JSON.stringify(pixPayload),
        });

        if (pixResponse.ok) {
          const pixData = await pixResponse.json();
          pixQrcode = pixData.qrcode || null;
          pixCopyPaste = pixData.copy_paste || null;
          pixExpiresAt = pixData.expires_at || null;

          if (pixData.id) {
            await pool.execute(
              'UPDATE orders SET gateway_payment_id = ? WHERE id = ?',
              [pixData.id, orderId],
            );
          }
        }
      } catch (pixErr) {
        fastify.log.error({ err: pixErr, orderId }, 'Erro ao gerar QR Code Pix');
      }
    }

    if (pixCopyPaste && pixExpiresAt) {
      await pool.execute(
        'UPDATE orders SET pix_qrcode = ?, pix_copy_paste = ?, pix_expires_at = ? WHERE id = ?',
        [pixQrcode, pixCopyPaste, pixExpiresAt, orderId],
      );
    }

    reply.status(201).send({
      id: orderId,
      total_amount: totalAmount,
      status: 'pending',
      pix_qrcode: pixQrcode,
      pix_copy_paste: pixCopyPaste,
      pix_expires_at: pixExpiresAt,
    });
  });

  // GET /:id — Status do pedido (público)
  fastify.get('/:id', async (request, _reply) => {
    const { id } = request.params;
    const pool = getPool();

    const [orders] = await pool.execute(
      'SELECT id, total_amount, status, pix_qrcode, pix_copy_paste, pix_expires_at, created_at FROM orders WHERE id = ? LIMIT 1',
      [id],
    );
    if (orders.length === 0) throw notFound('Pedido nao encontrado');

    return { order: orders[0] };
  });

  // GET /:id/download — Gerar links de download (apos pagamento)
  fastify.get('/:id/download', async (request, _reply) => {
    const { id } = request.params;
    const { email } = request.query;
    const pool = getPool();

    if (!email || !email.includes('@')) {
      throw badRequest('Email valido e obrigatorio para download');
    }

    const [orders] = await pool.execute(
      'SELECT id, tenant_id, customer_email, status FROM orders WHERE id = ? LIMIT 1',
      [id],
    );
    if (orders.length === 0) throw notFound('Pedido nao encontrado');

    const order = orders[0];
    if (order.status !== 'paid') throw unauthorized('Pedido ainda nao foi pago');
    if (order.customer_email !== email) throw unauthorized('Email nao corresponde ao pedido');

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
  // Protegido por assinatura do webhook
  fastify.post('/webhook/pix', async (request, reply) => {
    const webhookSecret = env.pix.webhookSecret;

    // Validar assinatura se o segredo estiver configurado
    if (webhookSecret) {
      const signature = request.headers['x-webhook-signature'] || '';
      const payload = JSON.stringify(request.body || {});
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      if (!safeCompare(signature, expected)) {
        fastify.log.warn({ ip: request.ip }, 'Webhook: assinatura invalida');
        throw unauthorized('Assinatura do webhook invalida');
      }
    }

    const { payment_id, status, order_id } = request.body || {};

    if (!payment_id || !status || !order_id) {
      throw badRequest('payment_id, status e order_id sao obrigatorios');
    }

    // Validar status permitido
    const ALLOWED_STATUSES = ['paid', 'expired', 'cancelled', 'refunded'];
    if (!ALLOWED_STATUSES.includes(status)) {
      throw badRequest(`Status invalido: ${status}`);
    }

    const pool = getPool();

    const [orders] = await pool.execute(
      'SELECT id, status FROM orders WHERE id = ? LIMIT 1',
      [order_id],
    );
    if (orders.length === 0) throw notFound('Pedido nao encontrado');

    const currentStatus = orders[0].status;

    // Prevenir repeticoes: se o status ja for o mesmo, ignorar
    if (currentStatus === status) {
      return reply.status(200).send({ received: true, ignored: true });
    }

    // Validar transicao de estado
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      fastify.log.warn({ order_id, from: currentStatus, to: status }, 'Webhook: transicao de estado invalida');
      throw badRequest(`Transicao de ${currentStatus} para ${status} nao permitida`);
    }

    // Impedir que webhook nao autenticado marque como pago
    if (status === 'paid' && !webhookSecret) {
      fastify.log.error({ order_id }, 'Webhook: tentativa de marcar como pago sem segredo configurado');
      throw unauthorized('Webhook nao configurado para confirmar pagamentos');
    }

    await pool.execute(
      'UPDATE orders SET status = ?, gateway_payment_id = COALESCE(?, gateway_payment_id), paid_at = IF(? = "paid", NOW(), NULL) WHERE id = ?',
      [status, payment_id, status, order_id],
    );

    fastify.log.info({ order_id, status, payment_id }, 'Webhook: pedido atualizado');

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
