/* eslint-disable @typescript-eslint/no-explicit-any */
// Boots the REAL Express app on :5055 with an in-memory data layer and stubbed
// Cloudinary/S3. Dev/test only — never part of the production build.
import './e2e-env';
import app from '../app';
import * as storage from '../services/storageService';
import * as cloud from '../services/cloudinaryService';
import { installFakeDb, seed } from './fakeDb';

installFakeDb(seed());
(storage as any).uploadPrivateFile = async (_b: Buffer, name: string) => ({ key: `fake/${name}`, url: `https://storage.invalid/fake/${name}` });
(cloud as any).uploadImageBuffer = async () => 'https://res.cloudinary.com/demo/image/upload/e2e-cover.png';

app.listen(5055, () => console.log('[e2e] real API + in-memory data layer on http://localhost:5055'));
