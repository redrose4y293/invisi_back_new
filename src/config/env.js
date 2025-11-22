import dotenv from 'dotenv';
dotenv.config();

const toList = (v) => (v ? v.split(',').map(s => s.trim()) : []);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  corsOrigins: toList(process.env.CORS_ORIGINS || '*'),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  dbUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.ACCESS_TTL || '15m',
    refreshTtl: process.env.REFRESH_TTL || '30d'
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL
  },
  s3: {
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || ''
  }
};
