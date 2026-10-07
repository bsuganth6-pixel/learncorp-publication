import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

// Uploads an image buffer to Cloudinary and returns its public URL.
// Used for book covers, author photos, and other site imagery.
export function uploadImageBuffer(buffer: Buffer, folder: string): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw ApiError.internal(
      'Image storage is not configured yet. Set CLOUDINARY_* in your .env file.'
    );
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `book-publication/${folder}`, resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
