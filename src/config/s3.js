import { S3Client } from '@aws-sdk/client-s3';
import { config } from './env.js';

export const s3 = new S3Client({
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  }
});

export const s3Bucket = config.s3.bucket;
export const s3PublicBaseUrl = config.s3.publicBaseUrl;
