import { getPool } from '../config/database.js';
import { notFound, badRequest } from '../utils/errors.js';

const ALLOWED_FONTS = [
  'Inter', 'Poppins', 'Roboto', 'Lato', 'Open Sans', 'Montserrat',
  'Playfair Display', 'Merriweather', 'Nunito', 'Raleway',
];

const ALLOWED_TEMPLATES = ['classic', 'modern', 'minimal', 'bold', 'elegant'];

const NAME_MAX = 100;
const BIO_MAX = 500;
const HEADLINE_MAX = 255;
const PHONE_MAX = 30;
const SOCIAL_MAX = 255;

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const PHONE_RE = /^[\d\s\-()+]{8,20}$/;
const HTTPS_URL_RE = /^https:\/\/.+/;

function validateProfileFields(body) {
  const errors = [];

  if (body.name !== undefined) {
    const n = (body.name || '').trim();
    if (n.length < 2 || n.length > NAME_MAX) {
      errors.push(`Nome deve ter entre 2 e ${NAME_MAX} caracteres`);
    }
  }

  if (body.bio !== undefined && body.bio !== null) {
    if (typeof body.bio !== 'string') {
      errors.push('Bio deve ser texto');
    } else if (body.bio.length > BIO_MAX) {
      errors.push(`Bio deve ter no máximo ${BIO_MAX} caracteres`);
    }
  }

  if (body.headline !== undefined && body.headline !== null) {
    if (typeof body.headline !== 'string') {
      errors.push('Frase de destaque deve ser texto');
    } else if (body.headline.length > HEADLINE_MAX) {
      errors.push(`Frase de destaque deve ter no máximo ${HEADLINE_MAX} caracteres`);
    }
  }

  if (body.phone !== undefined && body.phone !== null) {
    if (typeof body.phone !== 'string' || !PHONE_RE.test(body.phone)) {
      errors.push('Telefone inválido');
    }
  }

  if (body.whatsapp !== undefined && body.whatsapp !== null) {
    if (typeof body.whatsapp !== 'string' || !PHONE_RE.test(body.whatsapp)) {
      errors.push('WhatsApp inválido');
    }
  }

  const socialFields = ['instagram', 'twitter', 'facebook', 'linkedin', 'youtube', 'tiktok'];
  for (const field of socialFields) {
    if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
      const val = body[field].trim();
      if (!HTTPS_URL_RE.test(val)) {
        errors.push(`${field}: apenas URLs HTTPS são permitidas`);
      }
      if (/javascript:|data:|vbscript:/i.test(val)) {
        errors.push(`${field}: protocolo não permitido`);
      }
      if (val.length > SOCIAL_MAX) {
        errors.push(`${field}: máximo ${SOCIAL_MAX} caracteres`);
      }
    }
  }

  if (body.theme_config !== undefined && body.theme_config !== null) {
    if (typeof body.theme_config !== 'object' || Array.isArray(body.theme_config)) {
      errors.push('Configuração de tema inválida');
    } else {
      const t = body.theme_config;

      if (t.font !== undefined && t.font !== null) {
        if (!ALLOWED_FONTS.includes(t.font)) {
          errors.push(`Fonte não permitida. Escolha: ${ALLOWED_FONTS.join(', ')}`);
        }
      }

      if (t.template !== undefined && t.template !== null) {
        if (!ALLOWED_TEMPLATES.includes(t.template)) {
          errors.push(`Template não permitido. Escolha: ${ALLOWED_TEMPLATES.join(', ')}`);
        }
      }

      const colorFields = ['primary_color', 'secondary_color', 'background_color', 'text_color', 'accent_color'];
      for (const cf of colorFields) {
        if (t[cf] !== undefined && t[cf] !== null) {
          if (typeof t[cf] !== 'string' || !HEX_COLOR_RE.test(t[cf])) {
            errors.push(`${cf}: formato hexadecimal inválido (ex: #FF5733)`);
          }
        }
      }

      const urlFields = ['cover_url', 'profile_url'];
      for (const uf of urlFields) {
        if (t[uf] !== undefined && t[uf] !== null && t[uf] !== '') {
          if (typeof t[uf] !== 'string') {
            errors.push(`${uf}: deve ser texto`);
          } else if (!HTTPS_URL_RE.test(t[uf]) && !t[uf].startsWith('/uploads/')) {
            errors.push(`${uf}: deve ser URL HTTPS ou caminho local`);
          }
        }
      }
    }
  }

  return errors;
}

export default async function tenantRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireTenant);

  fastify.get('/stats', async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [[{ albumCount }]] = await pool.execute(
      'SELECT COUNT(*) AS albumCount FROM albums WHERE tenant_id = ? AND deleted_at IS NULL',
      [tenantId],
    );

    const [[{ mediaCount }]] = await pool.execute(
      'SELECT COUNT(*) AS mediaCount FROM media_files WHERE tenant_id = ? AND deleted_at IS NULL',
      [tenantId],
    );

    const [[{ orderCount }]] = await pool.execute(
      'SELECT COUNT(*) AS orderCount FROM orders WHERE tenant_id = ?',
      [tenantId],
    );

    const [[{ revenue }]] = await pool.execute(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders WHERE tenant_id = ? AND status = ?`,
      [tenantId, 'paid'],
    );

    return { stats: { albumCount, mediaCount, orderCount, revenue: parseFloat(revenue) } };
  });

  fastify.patch('/profile', async (request, reply) => {
    const tenantId = request.tenantId;
    const body = request.body || {};
    const pool = getPool();

    const errors = validateProfileFields(body);
    if (errors.length > 0) throw badRequest(errors.join('. '));

    const [rows] = await pool.execute(
      'SELECT id FROM tenants WHERE id = ? LIMIT 1',
      [tenantId],
    );
    if (rows.length === 0) throw notFound('Conta não encontrada');

    const updates = [];
    const params = [];

    const stringFields = ['name', 'bio', 'headline', 'pix_key', 'instagram', 'twitter',
      'facebook', 'linkedin', 'youtube', 'tiktok', 'phone', 'whatsapp',
      'cover_url', 'profile_photo_url', 'contact_email'];

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        const val = body[field];
        updates.push(`${field} = ?`);
        params.push(val !== null && val !== '' ? val.toString().trim() : null);
      }
    }

    if (body.pix_key_type !== undefined) {
      const PIX_TYPES = ['cpf', 'cnpj', 'email', 'phone', 'random'];
      const normalizedType = PIX_TYPES.includes(body.pix_key_type) ? body.pix_key_type : null;
      updates.push('pix_key_type = ?');
      params.push(normalizedType);
    }

    if (body.theme_config !== undefined) {
      updates.push('theme_config = ?');
      params.push(JSON.stringify(body.theme_config));
    }

    if (updates.length > 0) {
      params.push(tenantId);
      const [result] = await pool.execute(
        `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );
      if (result.affectedRows === 0) throw notFound('Conta não encontrada');
    }

    reply.status(200).send({ updated: true });
  });

  fastify.get('/profile', async (request) => {
    const tenantId = request.tenantId;
    const pool = getPool();

    const [rows] = await pool.execute(
      `SELECT id, name, email, slug, bio, headline,
              pix_key, pix_key_type, theme_config,
              instagram, twitter, facebook, linkedin, youtube, tiktok,
              phone, whatsapp, cover_url, profile_photo_url, contact_email,
              storage_quota, storage_used, created_at
       FROM tenants WHERE id = ? LIMIT 1`,
      [tenantId],
    );

    if (rows.length === 0) throw notFound('Conta não encontrada');

    const tenant = rows[0];
    if (tenant?.theme_config && typeof tenant.theme_config === 'string') {
      tenant.theme_config = JSON.parse(tenant.theme_config);
    }
    return { tenant };
  });

  fastify.post('/upload', async (request, reply) => {
    const tenantId = request.tenantId;
    const data = await request.file();
    if (!data) throw badRequest('Arquivo é obrigatório');

    const type = request.query.type || 'cover';
    const ALLOWED_TYPES = ['cover', 'profile'];
    if (!ALLOWED_TYPES.includes(type)) throw badRequest('Tipo de upload inválido');

    const ext = data.filename.split('.').pop() || 'jpg';
    const fileName = `${type}-${tenantId}-${Date.now()}.${ext}`;
    const buffer = await data.toBuffer();

    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT theme_config FROM tenants WHERE id = ? LIMIT 1',
      [tenantId],
    );
    if (rows.length === 0) throw notFound('Conta não encontrada');

    let theme = rows[0]?.theme_config;
    if (theme && typeof theme === 'string') theme = JSON.parse(theme);
    if (!theme || typeof theme !== 'object') theme = {};

    const photoPath = `/uploads/${fileName}`;
    if (type === 'cover') {
      theme.cover_url = photoPath;
    }
    if (type === 'profile') {
      theme.profile_url = photoPath;
    }

    await pool.execute(
      'UPDATE tenants SET theme_config = ? WHERE id = ?',
      [JSON.stringify(theme), tenantId],
    );

    const { uploadOriginal } = await import('../services/storage.js');
    await uploadOriginal(
      `tenants/${tenantId}/${fileName}`,
      buffer,
      data.mimetype || 'image/jpeg',
    );

    reply.status(200).send({ url: photoPath });
  });
}
