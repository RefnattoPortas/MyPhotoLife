import fp from 'fastify-plugin';
import { unauthorized, badRequest } from '../utils/errors.js';

const CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const CSRF_EXEMPT_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

async function authPlugin(fastify) {
  fastify.decorate('authenticate', async function (request, _reply) {
    try {
      const token = request.cookies?.[fastify.cookieName]
        || request.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) throw new Error();
      const decoded = await fastify.jwt.verify(token);
      request.user = decoded;
    } catch {
      throw unauthorized('Invalid or expired token');
    }
  });

  fastify.decorate('requireTenant', async function (request) {
    const tid = request.user?.tenantId;
    if (!tid) {
      throw unauthorized('Tenant context required');
    }
    request.tenantId = tid;
  });

  fastify.decorate('requireRole', (...roles) => {
    return async function (request) {
      if (!request.user || !roles.includes(request.user.role)) {
        throw unauthorized('Insufficient permissions');
      }
    };
  });

  fastify.decorate('verifyCsrf', async function (request) {
    if (!CSRF_METHODS.includes(request.method)) return;
    if (CSRF_EXEMPT_ROUTES.includes(request.url)) return;
    if (request.url.startsWith('/api/orders/webhook')) return;
    const headerToken = request.headers['x-csrf-token'];
    const cookieValue = request.cookies?.[fastify.cookieName];
    if (!headerToken || !cookieValue || headerToken !== cookieValue) {
      throw badRequest('Invalid CSRF token');
    }
  });

  fastify.addHook('onRequest', async (request, _reply) => {
    if (!CSRF_METHODS.includes(request.method)) return;
    if (CSRF_EXEMPT_ROUTES.includes(request.url)) return;
    if (request.url.startsWith('/api/orders/webhook')) return;
    if (!request.cookies?.[fastify.cookieName]) return;
    await fastify.verifyCsrf(request);
  });
}

export default fp(authPlugin, { name: 'auth-decorators' });
