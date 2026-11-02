import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { s3, storageBucket, isStorageConfigured } from '../config/storage';
import { ApiError } from '../utils/ApiError';

// Manuscript / cover files are stored privately (never public) and served
// only through short-lived signed URLs generated on demand for admins.
export async function uploadPrivateFile(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder: string
): Promise<{ key: string; url: string }> {
  if (!isStorageConfigured) {
    throw ApiError.internal(
      'File storage is not configured yet. Set STORAGE_* in your .env file.'
    );
  }
  // Only the extension-bearing tail of the client's file name is kept, and only safe characters, so no
  // path tricks or odd characters ever reach the object key.
  const safeName = originalName.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+/, '').slice(-80) || 'file';
  const key = `${folder}/${randomUUID()}-${safeName}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: storageBucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return { key, url: `${process.env.STORAGE_PUBLIC_BASE_URL || ''}/${key}` };
}

export async function getSignedFileUrl(key: string, expiresInSeconds = 300): Promise<string> {
  if (!isStorageConfigured) {
    throw ApiError.internal('File storage is not configured yet.');
  }
  const command = new GetObjectCommand({ Bucket: storageBucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function deletePrivateFile(key: string): Promise<void> {
  if (!isStorageConfigured) return;
  await s3.send(new DeleteObjectCommand({ Bucket: storageBucket, Key: key }));
}

/** Reads a private object into memory. Only used for small images (a manuscript's cover) being promoted to the catalogue. */
export async function readPrivateFile(key: string): Promise<Buffer> {
  if (!isStorageConfigured) {
    throw ApiError.internal('File storage is not configured yet.');
  }
  const object = await s3.send(new GetObjectCommand({ Bucket: storageBucket, Key: key }));
  if (!object.Body) throw ApiError.notFound('File not found in storage');
  return Buffer.from(await object.Body.transformToByteArray());
}
