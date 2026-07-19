import fp from 'fastify-plugin';
import { unauthorized } from '../utils/errors.js';

async function authPlugin(fastify) {
  fastify.decorate('authenticate', async function (request, _reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      throw unauthorized('Invalid or expired token');
    }
  });

  fastify.decorate('requireTenant', async function (request) {
    const tid = request.tenantId || request.user?.tenantId;
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
}

export default fp(authPlugin, { name: 'auth-decorators' });
