import { getPool } from '../config/database.js';
import { notFound, badRequest, tooManyRequests } from '../utils/errors.js';
import { sendContactEmail } from '../services/email.js';

const contactRateLimit = new Map();

function checkContactRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 3;

  const entry = contactRateLimit.get(ip);
  if (!entry) {
    contactRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (now > entry.resetAt) {
    contactRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    throw tooManyRequests('Muitas tentativas de contato. Tente novamente mais tarde.');
  }
}

// Cleanup stale entries every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of contactRateLimit) {
    if (now > entry.resetAt) contactRateLimit.delete(ip);
  }
}, 30 * 60 * 1000);

export default async function portfolioRoutes(fastify) {
  fastify.get('/:slug', async (request, _reply) => {
    const { slug } = request.params;
    const pool = getPool();

    const [tenants] = await pool.execute(
      `SELECT id, name, slug, bio, headline, theme_config,
              instagram, twitter, phone, whatsapp, contact_email
       FROM tenants WHERE slug = ? AND is_active = TRUE LIMIT 1`,
      [slug],
    );
    if (tenants.length === 0) throw notFound('Photographer not found');

    const tenant = tenants[0];
    if (tenant.theme_config && typeof tenant.theme_config === 'string') {
      tenant.theme_config = JSON.parse(tenant.theme_config);
    }

    const [albums] = await pool.execute(
      `SELECT a.id, a.title, a.description, a.price, a.is_for_sale,
              a.display_order,
              mf.thumbnail_path AS cover_thumbnail,
              (SELECT COUNT(*) FROM media_files m WHERE m.album_id = a.id AND m.deleted_at IS NULL) AS media_count
       FROM albums a
       LEFT JOIN media_files mf ON mf.id = a.cover_media_id
       WHERE a.tenant_id = ? AND a.is_public = TRUE AND a.deleted_at IS NULL
       ORDER BY a.display_order ASC, a.created_at DESC`,
      [tenant.id],
    );

    const [saleMedia] = await pool.execute(
       `SELECT id, filename, thumbnail_path, optimized_path, width, height, price, album_id
        FROM media_files
        WHERE tenant_id = ? AND is_for_sale = TRUE AND album_id IS NULL AND deleted_at IS NULL
        ORDER BY display_order ASC, created_at DESC`,
      [tenant.id],
    );

    const [schedule] = await pool.execute(
      `SELECT id, title, event_date, location, status
       FROM schedule
       WHERE tenant_id = ? AND deleted_at IS NULL AND event_date >= CURDATE()
       ORDER BY event_date ASC`,
      [tenant.id],
    );

    return {
      photographer: {
        name: tenant.name,
        slug: tenant.slug,
        bio: tenant.bio,
        headline: tenant.headline,
        theme: tenant.theme_config,
        instagram: tenant.instagram,
        twitter: tenant.twitter,
        phone: tenant.phone,
        whatsapp: tenant.whatsapp,
        email_contact: !!tenant.contact_email,
      },
      albums,
      sale_media: saleMedia,
      schedule,
    };
  });

  fastify.get('/:slug/albums/:id', async (request, _reply) => {
    const { slug, id } = request.params;
    const pool = getPool();

    const [tenants] = await pool.execute(
      'SELECT id, name, theme_config FROM tenants WHERE slug = ? AND is_active = TRUE LIMIT 1',
      [slug],
    );
    if (tenants.length === 0) throw notFound('Photographer not found');

    const tenantRow = tenants[0];
    if (tenantRow.theme_config && typeof tenantRow.theme_config === 'string') {
      tenantRow.theme_config = JSON.parse(tenantRow.theme_config);
    }

    const [albums] = await pool.execute(
      'SELECT * FROM albums WHERE id = ? AND tenant_id = ? AND is_public = TRUE AND deleted_at IS NULL LIMIT 1',
      [id, tenants[0].id],
    );
    if (albums.length === 0) throw notFound('Album not found');

    const [media] = await pool.execute(
       `SELECT id, filename, optimized_path, thumbnail_path, width, height,
               is_for_sale, price, display_order
        FROM media_files
        WHERE album_id = ? AND deleted_at IS NULL
        ORDER BY display_order ASC, created_at ASC`,
      [id],
    );

    return { album: albums[0], media, theme: tenantRow.theme_config };
  });

  fastify.post('/:slug/contact', async (request, reply) => {
    const { slug } = request.params;
    const pool = getPool();

    const [tenants] = await pool.execute(
      'SELECT id, name, contact_email FROM tenants WHERE slug = ? AND is_active = TRUE LIMIT 1',
      [slug],
    );
    if (tenants.length === 0) throw notFound('Photographer not found');
    if (!tenants[0].contact_email) throw badRequest('Este fotógrafo não aceita contato por e-mail');

    const ip = request.ip;
    checkContactRateLimit(ip);

    const { name, email, subject, message, consent, _hp } = request.body || {};

    if (_hp) {
      return reply.status(200).send({ success: true, message: 'Mensagem enviada com sucesso' });
    }

    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();
    const trimmedSubject = (subject || '').trim();
    const trimmedMessage = (message || '').trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw badRequest('Nome deve ter entre 2 e 100 caracteres');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw badRequest('E-mail inválido');
    }

    if (trimmedSubject.length < 1 || trimmedSubject.length > 200) {
      throw badRequest('Assunto deve ter entre 1 e 200 caracteres');
    }

    if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      throw badRequest('Mensagem deve ter entre 10 e 2000 caracteres');
    }

    if (!consent) {
      throw badRequest('É necessário consentir com o envio dos dados');
    }

    const spamWords = ['http://', 'https://', 'www.', '.com', '.net', '.org', 'click here', 'buy now', 'free'];
    const lowerMsg = trimmedMessage.toLowerCase();
    const spamScore = spamWords.filter((w) => lowerMsg.includes(w)).length;
    if (spamScore >= 4) {
      return reply.status(200).send({ success: true, message: 'Mensagem enviada com sucesso' });
    }

    await sendContactEmail({
      to: tenants[0].contact_email,
      fromName: trimmedName,
      fromEmail: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    return { success: true, message: 'Mensagem enviada com sucesso' };
  });
}
