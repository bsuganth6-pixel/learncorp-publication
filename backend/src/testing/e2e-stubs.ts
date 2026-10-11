/* eslint-disable @typescript-eslint/no-explicit-any */
// Dev/test only. Replaces the Cloudinary and S3 service modules before the app
// loads, so uploads can be exercised without credentials.
const stub = (relative: string, exports: Record<string, unknown>) => {
  const filename = require.resolve(relative);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as any;
};

stub('../services/storageService', {
  uploadPrivateFile: async (_b: Buffer, name: string) => ({ key: `fake/${name}`, url: `https://storage.invalid/fake/${name}` }),
  getSignedFileUrl: async (key: string) => `https://storage.invalid/signed/${key}`,
  deletePrivateFile: async () => undefined,
});
stub('../services/cloudinaryService', {
  uploadImageBuffer: async () => 'https://res.cloudinary.com/demo/image/upload/e2e-cover.png',
});
