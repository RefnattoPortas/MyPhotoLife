import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env, connectDatabase } from './config/index.js';
import tenantPlugin from './plugins/tenant.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import albumRoutes from './routes/albums.js';
import mediaRoutes from './routes/media.js';
import orderRoutes from './routes/orders.js';
import portfolioRoutes from './routes/portfolio.js';
import tenantRoutes from './routes/tenant.js';
import scheduleRoutes from './routes/schedule.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.nodeEnv !== 'test',
    trustProxy: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Rate limit mais restritivo para rotas de autenticação
  app.register(async function authRateLimit(instance) {
    await instance.register(rateLimit, {
      global: false,
      max: 5,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip,
    });

    instance.addHook('onRoute', (routeOptions) => {
      if (routeOptions.url?.startsWith('/api/auth/')) {
        const origHandler = routeOptions.preHandler || [];
        routeOptions.preHandler = Array.isArray(origHandler)
          ? [...origHandler, instance.rateLimit()]
          : [instance.rateLimit()];
      }
    });
  });

  await app.register(cors, {
    origin: env.cors.origin,
    credentials: true,
  });

  await app.register(cookie, {
    secret: env.jwt.secret,
    parseOptions: {},
  });

  const COOKIE_NAME = 'auth_token';
  const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
    signed: true,
    maxAge: 60 * 60 * 24 * 7,
  };

  app.decorate('cookieName', COOKIE_NAME);
  app.decorate('cookieOptions', COOKIE_OPTIONS);

  await app.register(jwt, {
    secret: env.jwt.secret,
    sign: { expiresIn: env.jwt.expiresIn },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 500 * 1024 * 1024,
    },
  });

  await app.register(tenantPlugin);
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(albumRoutes, { prefix: '/api/albums' });
  await app.register(mediaRoutes, { prefix: '/api/media' });
  await app.register(orderRoutes, { prefix: '/api/orders' });
  await app.register(portfolioRoutes, { prefix: '/api/portfolio' });
  await app.register(tenantRoutes, { prefix: '/api/tenant' });
  await app.register(scheduleRoutes, { prefix: '/api/schedule' });

  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Sanitiza Content-Type para mitigar bypass com tab (GHSA-jx2c-rxcm-jvmq)
  app.addHook('onRequest', async (request, _reply) => {
    const ct = request.headers['content-type'];
    if (ct && ct.includes('\t')) {
      request.headers['content-type'] = ct.replace(/\t/g, '');
    }
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';
    const message = statusCode === 500 ? error.message : error.message;

    if (statusCode === 500) {
      console.error('[ERROR]', error);
    }

    reply.status(statusCode).send({
      error: true,
      statusCode,
      code,
      message,
    });
  });

  return app;
}

async function start() {
  await connectDatabase();
  const app = await buildApp();

  try {
    await app.listen({ port: env.port, host: env.host });
    console.log(`[Server] Running at http://${env.host}:${env.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
