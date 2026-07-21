/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
  // API routes são tratadas por Next.js Route Handlers (app/api/)
  // O backend Fastify externo é acessado via proxy nos Route Handlers
  // Não há rewrites - as rotas existem nativamente no Next.js
  // Configuração de CORS é feita nos próprios handlers
  serverRuntimeConfig: {
    apiUrl: process.env.API_URL || '',
  },
};

module.exports = nextConfig;
