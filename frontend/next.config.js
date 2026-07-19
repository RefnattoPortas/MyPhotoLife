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
  // Redireciona apenas rotas específicas do backend Fastify
  // Rotas Next.js (auth, tenant, schedule, portfolio) permanecem locais
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/albums/:path*',
        destination: `${apiUrl}/api/albums/:path*`,
      },
      {
        source: '/api/media/:path*',
        destination: `${apiUrl}/api/media/:path*`,
      },
      {
        source: '/api/orders/:path*',
        destination: `${apiUrl}/api/orders/:path*`,
      },
      {
        source: '/api/health',
        destination: `${apiUrl}/api/health`,
      },
    ];
  },
};

module.exports = nextConfig;
