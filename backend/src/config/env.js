import 'dotenv/config';

function requireEnv(name, minLength) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Variavel obrigatoria ${name} nao definida em producao`);
  }
  if (minLength && value && value.length < minLength) {
    throw new Error(`Variavel ${name} deve ter pelo menos ${minLength} caracteres`);
  }
  return value || '';
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'myphotolife',
  },

  jwt: {
    secret: (() => {
      if (process.env.NODE_ENV === 'production') {
        return requireEnv('JWT_SECRET', 32);
      }
      return process.env.JWT_SECRET || 'dev-secret-change-in-production';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || '',
    region: process.env.STORAGE_REGION || 'auto',
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
    bucketOriginals: process.env.STORAGE_BUCKET_ORIGINALS || 'myphotolife-originals',
    bucketOptimized: process.env.STORAGE_BUCKET_OPTIMIZED || 'myphotolife-optimized',
    publicUrl: process.env.STORAGE_PUBLIC_URL || '',
  },

  pix: {
    gatewayUrl: process.env.PIX_GATEWAY_URL || '',
    gatewayApiKey: process.env.PIX_GATEWAY_API_KEY || '',
    webhookSecret: process.env.PIX_GATEWAY_WEBHOOK_SECRET || '',
  },

  image: {
    quality: parseInt(process.env.IMAGE_QUALITY || '80', 10),
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '2048', 10),
    thumbWidth: parseInt(process.env.THUMBNAIL_WIDTH || '400', 10),
    thumbHeight: parseInt(process.env.THUMBNAIL_HEIGHT || '300', 10),
  },

  mail: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@myphotolife.com',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};

export default env;
