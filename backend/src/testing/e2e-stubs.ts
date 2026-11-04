/* eslint-disable @typescript-eslint/no-explicit-any */
// Dev/test only. Replaces the Cloudinary and S3 service modules before the app
// loads, so uploads can be exercised without credentials.
const stub = (relative: string, exports: Record<string, unknown>) => {
  const filename = require.resolve(relative);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as any;
};

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

stub('../services/storageService', {
  uploadPrivateFile: async (_b: Buffer, name: string, _mime: string, folder: string) => ({
    key: `${folder}/fake-${name}`, url: `https://storage.invalid/${folder}/fake-${name}`,
  }),
  getSignedFileUrl: async (key: string) => `https://storage.invalid/signed/${key}`,
  readPrivateFile: async () => PNG_1X1,
  deletePrivateFile: async () => undefined,
});
stub('../services/cloudinaryService', {
  uploadImageBuffer: async () => 'https://res.cloudinary.com/demo/image/upload/e2e-cover.png',
});
