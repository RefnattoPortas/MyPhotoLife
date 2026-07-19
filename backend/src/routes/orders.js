import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getPool } from '../config/database.js';
import { generateSignedUrl } from '../services/storage.js';
import { generatePixPayment, queryGatewayPayment, PIX_EXPIRATION_MINUTES } from '../services/pix.js';
import { notFound, badRequest, unauthorized } from '../utils/errors.js';
import { env } from '../config/index.js';

const VALID_TRANSITIONS = {
  pending: ['paid', 'expired', 'cancelled'],
  paid: ['refunded'],
  expired: [],
  cancelled: [],
};

const PIX_AUTO_EXPIRE_MINUTES = PIX_EXPIRATION_MINUTES;

function safeCompare(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export default async function orderRoutes(fastify) {
  fastify.post('/', async (request, reply) => {
    const {
      tenant_slug, customer_name, customer_email, customer_phone,
      items, idempotency_key,
    } = request.body || {};

    if (!tenant_slug || !customer_name || !customer_email || !items?.length) {
      throw badRequest('tenant_slug, customer_name, customer_email and items are required');
    }

    if (!customer_email.includes('@') || customer_email.length > 254) {
      throw badRequest('Invalid customer email');
    }

    if (customer_name.length < 2 || customer_name.length > 200) {
      throw badRequest('Customer name must be between 2 and 200 characters');
    }

    if (customer_phone && !/^[\d\s\-()+]{8,20}$/.test(customer_phone)) {
      throw badRequest('Invalid customer phone');
    }

    if (items.length > 100) {
      throw badRequest('Maximum of 100 items per order');
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      if (idempotency_key) {
        const [existing] = await conn.execute(
          'SELECT id, status, total_amount, pix_qrcode, pix_copy_paste, pix_expires_at FROM orders WHERE idempotency_key = ? LIMIT 1',
          [idempotency_key],
        );
        if (existing.length > 0) {
          await conn.commit();
          const order = existing[0];
          return reply.status(200).send({
            id: order.id,
            total_amount: parseFloat(order.total_amount),
            status: order.status,
            pix_qrcode: order.pix_qrcode,
            pix_copy_paste: order.pix_copy_paste,
            pix_expires_at: order.pix_expires_at,
            idempotent: true,
          });
        }
      }

      const [tenants] = await conn.execute(
        'SELECT id, name, pix_key, pix_key_type FROM tenants WHERE slug = ? AND is_active = TRUE LIMIT 1',
        [tenant_slug],
      );
      if (tenants.length === 0) throw notFound('Photographer not found');

      const tenantId = tenants[0].id;
      const merchantName = tenants[0].name;
      const pixKey = tenants[0].pix_key;
      const pixKeyType = tenants[0].pix_key_type;

      if (!pixKey) {
        throw badRequest('Photographer has not configured a Pix key yet');
      }

      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        if (item.type === 'photo' && item.media_id) {
          const [media] = await conn.execute(
             `SELECT id, filename, price, is_for_sale, album_id
              FROM media_files WHERE id = ? AND tenant_id = ? AND is_for_sale = TRUE AND deleted_at IS NULL LIMIT 1`,
            [item.media_id, tenantId],
          );
          if (media.length === 0) {
            throw notFound(`Photo ${item.media_id} not available for sale`);
          }
          const price = parseFloat(media[0].price);
          if (price <= 0) throw badRequest(`Photo ${item.media_id} has no price set`);
          totalAmount += price;
          orderItems.push({
            type: 'photo',
            mediaId: media[0].id,
            albumId: media[0].album_id,
            title: media[0].filename,
            price,
          });
        } else if (item.type === 'album' && item.album_id) {
          const [album] = await conn.execute(
            `SELECT id, title, price, is_for_sale, is_public
             FROM albums WHERE id = ? AND tenant_id = ? AND is_for_sale = TRUE AND is_public = TRUE AND deleted_at IS NULL LIMIT 1`,
            [item.album_id, tenantId],
          );
          if (album.length === 0) {
            throw notFound(`Album ${item.album_id} not available for sale`);
          }
          const price = parseFloat(album[0].price);
          if (price <= 0) throw badRequest(`Album ${item.album_id} has no price set`);
          totalAmount += price;
          orderItems.push({
            type: 'album',
            albumId: album[0].id,
            title: album[0].title,
            price,
          });
        } else {
          throw badRequest(`Invalid item: ${JSON.stringify(item)}`);
        }
      }

      if (orderItems.length === 0) throw badRequest('No valid items for purchase');
      if (totalAmount <= 0) throw badRequest('Order total must be greater than zero');

      const orderId = uuidv4();
      const pixExpiresAt = new Date(Date.now() + PIX_AUTO_EXPIRE_MINUTES * 60 * 1000);

      await conn.execute(
        `INSERT INTO orders
          (id, idempotency_key, tenant_id, customer_name, customer_email, customer_phone,
           total_amount, status, pix_expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [orderId, idempotency_key || null, tenantId, customer_name, customer_email,
         customer_phone || null, totalAmount, pixExpiresAt],
      );

      for (const item of orderItems) {
        await conn.execute(
          `INSERT INTO order_items (id, order_id, media_file_id, album_id, item_type, title, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [uuidv4(), orderId, item.mediaId || null, item.albumId || null,
           item.type, item.title, item.price, item.price],
        );
      }

      await conn.commit();

      let pixQrcode = null;
      let pixCopyPaste = null;
      let gatewayPaymentId = null;

      try {
        const pixResult = await generatePixPayment({
          amount: totalAmount,
          tenantId,
          pixKey,
          pixKeyType,
          merchantName,
          orderId,
        });
        pixQrcode = pixResult.pixQrcode;
        pixCopyPaste = pixResult.pixCopyPaste;
        gatewayPaymentId = pixResult.gatewayPaymentId;
        if (pixResult.pixExpiresAt) {
          pixExpiresAt.setTime(pixResult.pixExpiresAt.getTime());
        }
      } catch (pixErr) {
        fastify.log.error({ err: pixErr, orderId }, 'Pix generation failed');
      }

      if (pixCopyPaste || pixQrcode || gatewayPaymentId) {
        await pool.execute(
          `UPDATE orders SET
            pix_qrcode = ?, pix_copy_paste = ?, pix_expires_at = ?,
            gateway_payment_id = COALESCE(?, gateway_payment_id)
           WHERE id = ?`,
          [pixQrcode, pixCopyPaste, pixExpiresAt, gatewayPaymentId, orderId],
        );
      }

      reply.status(201).send({
        id: orderId,
        total_amount: totalAmount,
        status: 'pending',
        pix_qrcode: pixQrcode,
        pix_copy_paste: pixCopyPaste,
        pix_expires_at: pixExpiresAt.toISOString(),
      });
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      conn.release();
    }
  });

  fastify.get('/:id', async (request) => {
    const { id } = request.params;
    const pool = getPool();

    const [orders] = await pool.execute(
      `SELECT id, total_amount, status, pix_qrcode, pix_copy_paste, pix_expires_at,
              created_at, paid_at
       FROM orders WHERE id = ? LIMIT 1`,
      [id],
    );
    if (orders.length === 0) throw notFound('Order not found');

    const order = orders[0];
    const now = new Date();
    if (order.status === 'pending' && order.pix_expires_at && new Date(order.pix_expires_at) < now) {
      await pool.execute(
        'UPDATE orders SET status = ? WHERE id = ? AND status = ?',
        ['expired', id, 'pending'],
      );
      order.status = 'expired';
    }

    return { order };
  });

  fastify.get('/:id/download', async (request) => {
    const { id } = request.params;
    const { email } = request.query;
    const pool = getPool();

    if (!email || !email.includes('@')) {
      throw badRequest('Valid email is required for download');
    }

    const [orders] = await pool.execute(
      'SELECT id, tenant_id, customer_email, status FROM orders WHERE id = ? LIMIT 1',
      [id],
    );
    if (orders.length === 0) throw notFound('Order not found');

    const order = orders[0];

    if (order.status !== 'paid') {
      if (order.status === 'pending') throw unauthorized('Payment still pending');
      if (order.status === 'expired') throw unauthorized('Payment expired');
      throw unauthorized('Order is not available for download');
    }

    if (order.customer_email !== email) throw unauthorized('Email does not match the order');

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

  function validateWebhookSignature(request, webhookSecret) {
    const signatureHeader = request.headers['x-webhook-signature'] || '';

    if (!signatureHeader) {
      if (!webhookSecret) return;
      throw unauthorized('Assinatura do webhook ausente');
    }

    let timestamp = null;
    let signature = signatureHeader;

    if (signatureHeader.includes(',') && signatureHeader.includes('=')) {
      const parts = {};
      signatureHeader.split(',').forEach((pair) => {
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
          parts[pair.substring(0, eqIdx).trim()] = pair.substring(eqIdx + 1);
        }
      });
      timestamp = parts.t ? parseInt(parts.t, 10) : null;
      signature = parts.v1 || signatureHeader;
    } else if (signatureHeader.includes('=') && !signatureHeader.includes(',')) {
      const eqIdx = signatureHeader.indexOf('=');
      const key = signatureHeader.substring(0, eqIdx).trim();
      const value = signatureHeader.substring(eqIdx + 1);
      if (key === 'v1') {
        signature = value;
      } else if (key === 't') {
        timestamp = parseInt(value, 10);
        signature = '';
      }
    }

    if (timestamp !== null) {
      if (isNaN(timestamp)) throw unauthorized('Timestamp do webhook inválido');
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        throw unauthorized('Timestamp do webhook fora da janela permitida');
      }
    }

    if (!webhookSecret) return;

    const payload = JSON.stringify(request.body || {});
    const signedPayload = timestamp !== null ? `${timestamp}.${payload}` : payload;

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    if (!safeCompare(signature, expected)) {
      throw unauthorized('Assinatura do webhook inválida');
    }
  }

  fastify.post('/webhook/pix', async (request, reply) => {
    const webhookSecret = env.pix.webhookSecret;

    validateWebhookSignature(request, webhookSecret);

    const { payment_id, status, order_id, event_id, amount, currency } = request.body || {};

    if (!event_id) throw badRequest('event_id é obrigatório');
    if (!payment_id || !status || !order_id) {
      throw badRequest('payment_id, status e order_id são obrigatórios');
    }

    const ALLOWED_STATUSES = ['paid', 'expired', 'cancelled', 'refunded'];
    if (!ALLOWED_STATUSES.includes(status)) {
      throw badRequest(`Status inválido: ${status}`);
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const eventRecordId = uuidv4();
      try {
        await conn.execute(
          `INSERT INTO webhook_events
             (id, event_id, order_id, gateway_payment_id, event_type, source_ip, amount, currency)
           VALUES (?, ?, ?, ?, 'pix', ?, ?, ?)`,
          [eventRecordId, event_id, order_id, payment_id, request.ip, amount || null, currency || null],
        );
      } catch (insertErr) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          await conn.rollback();
          return reply.status(200).send({ received: true, ignored: true });
        }
        throw insertErr;
      }

      const [orders] = await conn.execute(
        'SELECT id, status, total_amount, gateway_payment_id FROM orders WHERE id = ? LIMIT 1 FOR UPDATE',
        [order_id],
      );
      if (orders.length === 0) {
        await conn.execute(
          'UPDATE webhook_events SET error_message = ? WHERE id = ?',
          ['Pedido não encontrado', eventRecordId],
        );
        await conn.commit();
        throw notFound('Pedido não encontrado');
      }

      const order = orders[0];
      const currentStatus = order.status;

      if (currentStatus === status) {
        await conn.execute(
          'UPDATE webhook_events SET old_status = ?, new_status = ?, processed = TRUE WHERE id = ?',
          [currentStatus, status, eventRecordId],
        );
        await conn.commit();
        return reply.status(200).send({ received: true, ignored: true });
      }

      const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(status)) {
        await conn.execute(
          'UPDATE webhook_events SET error_message = ? WHERE id = ?',
          [`Transição de ${currentStatus} para ${status} não permitida`, eventRecordId],
        );
        await conn.commit();
        fastify.log.warn({ order_id, from: currentStatus, to: status }, 'Webhook: transição inválida');
        throw badRequest(`Transição de ${currentStatus} para ${status} não permitida`);
      }

      if (status === 'paid') {
        if (!webhookSecret) {
          await conn.execute(
            'UPDATE webhook_events SET error_message = ? WHERE id = ?',
            ['Webhook não configurado para confirmar pagamentos', eventRecordId],
          );
          await conn.commit();
          throw unauthorized('Webhook não configurado para confirmar pagamentos');
        }

        const incomingAmount = amount !== undefined && amount !== null ? parseFloat(amount) : null;
        if (incomingAmount !== null && incomingAmount !== parseFloat(order.total_amount)) {
          await conn.execute(
            'UPDATE webhook_events SET error_message = ? WHERE id = ?',
            [`Valor divergente: pagamento ${incomingAmount}, pedido ${order.total_amount}`, eventRecordId],
          );
          await conn.commit();
          fastify.log.warn(
            { order_id, expected: order.total_amount, received: incomingAmount },
            'Webhook: valor divergente',
          );
          throw badRequest(`Valor divergente: pagamento ${incomingAmount}, pedido ${order.total_amount}`);
        }

        if (currency && currency !== 'BRL') {
          await conn.execute(
            'UPDATE webhook_events SET error_message = ? WHERE id = ?',
            [`Moeda inválida: ${currency}`, eventRecordId],
          );
          await conn.commit();
          throw badRequest(`Moeda inválida: ${currency}`);
        }

        if (env.pix.gatewayUrl && env.pix.gatewayApiKey) {
          const gatewayData = await queryGatewayPayment(payment_id);
          if (!gatewayData) {
            await conn.execute(
              'UPDATE webhook_events SET error_message = ? WHERE id = ?',
              ['Não foi possível confirmar o pagamento com o gateway', eventRecordId],
            );
            await conn.commit();
            throw unauthorized('Não foi possível confirmar o pagamento com o gateway');
          }
          fastify.log.info({ order_id, payment_id }, 'Webhook: pagamento confirmado no gateway');
        }
      }

      const updateFields = ['status = ?', 'gateway_payment_id = COALESCE(?, gateway_payment_id)'];
      const updateValues = [status, payment_id];

      if (status === 'paid') {
        updateFields.push('paid_at = NOW()');
      }
      updateFields.push('updated_at = NOW()');

      await conn.execute(
        `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
        [...updateValues, order_id],
      );

      await conn.execute(
        'UPDATE webhook_events SET old_status = ?, new_status = ?, processed = TRUE WHERE id = ?',
        [currentStatus, status, eventRecordId],
      );

      await conn.commit();

      fastify.log.info({ order_id, status, payment_id, event_id }, 'Webhook: pedido atualizado');

      reply.status(200).send({ received: true });
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      conn.release();
    }
  });

  fastify.get('/', { preHandler: [fastify.authenticate, fastify.requireTenant] }, async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      `SELECT id, customer_name, customer_email, total_amount, status,
              created_at, paid_at, pix_expires_at
       FROM orders WHERE tenant_id = ? ORDER BY created_at DESC`,
      [tenantId],
    );

    const now = new Date();
    for (const row of rows) {
      if (row.status === 'pending' && row.pix_expires_at && new Date(row.pix_expires_at) < now) {
        row.status = 'expired';
      }
    }

    return { orders: rows };
  });
}
