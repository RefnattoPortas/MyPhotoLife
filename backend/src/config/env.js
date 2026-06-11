import 'dotenv/config';

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
    secret: process.env.JWT_SECRET || 'dev-secret',
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

  image: {
    quality: parseInt(process.env.IMAGE_QUALITY || '80', 10),
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '2048', 10),
    thumbWidth: parseInt(process.env.THUMBNAIL_WIDTH || '400', 10),
    thumbHeight: parseInt(process.env.THUMBNAIL_HEIGHT || '300', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};

export default env;
