import { S3Client } from '@aws-sdk/client-s3';

// Works with AWS S3 or any S3-compatible provider (e.g. Cloudflare R2) —
// for R2, set STORAGE_ENDPOINT to the account's R2 endpoint and STORAGE_REGION=auto.
export const storageBucket = process.env.STORAGE_BUCKET || '';

export const isStorageConfigured = Boolean(
  process.env.STORAGE_BUCKET &&
    process.env.STORAGE_ACCESS_KEY_ID &&
    process.env.STORAGE_SECRET_ACCESS_KEY
);

export const s3 = new S3Client({
  region: process.env.STORAGE_REGION || 'auto',
  endpoint: process.env.STORAGE_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: Boolean(process.env.STORAGE_ENDPOINT),
});
