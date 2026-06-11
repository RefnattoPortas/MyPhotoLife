import fp from 'fastify-plugin';
import { getPool } from '../config/database.js';
import { notFound } from '../utils/errors.js';

const PUBLIC_ROUTES = ['/api/auth/', '/api/health', '/api/orders/webhook'];
const SKIP_SUBDOMAIN = ['localhost', 'www', 'app'];

async function tenantPlugin(fastify) {
  fastify.decorateRequest('tenant', null);
  fastify.decorateRequest('tenantId', null);

  fastify.addHook('onRequest', async (request) => {
    const url = request.url;

    // Pula resolução de tenant em rotas públicas (registro, login, health)
    if (PUBLIC_ROUTES.some((prefix) => url.startsWith(prefix))) return;

    const pool = getPool();
    let identifier;

    // Resolução via subdomínio: só ativa se houver 2+ partes
    const host = request.headers['x-forwarded-host'] || request.hostname;
    const parts = host?.split('.') || [];
    const subdomain = parts.length >= 2 ? parts[0] : null;

    if (subdomain && !SKIP_SUBDOMAIN.includes(subdomain)) {
      identifier = subdomain;
    }

    // Resolução via slug na URL (portfólios públicos)
    const slugParam = request.params?.slug;
    if (!identifier && slugParam) {
      identifier = slugParam;
    }

    // Resolução via header customizado
    const tenantHeader = request.headers['x-tenant-slug'];
    if (!identifier && tenantHeader) {
      identifier = tenantHeader;
    }

    if (!identifier) return;

    const [rows] = await pool.execute(
      'SELECT id, name, slug, subdomain, pix_key, pix_key_type, theme_config, is_active FROM tenants WHERE (slug = ? OR subdomain = ?) AND is_active = TRUE LIMIT 1',
      [identifier, identifier],
    );

    if (rows.length === 0) {
      throw notFound('Tenant not found');
    }

    request.tenant = rows[0];
    request.tenantId = rows[0].id;
  });
}

export default fp(tenantPlugin, { name: 'tenant-resolver' });
