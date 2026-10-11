// Boots the REAL Express app on :5055 with an in-memory data layer and stubbed
// Cloudinary/S3. Dev/test only — never part of the production build.
import './e2e-env';
import './e2e-stubs'; // must come before the app is imported
import app from '../app';
import { installFakeDb, seed } from './fakeDb';

installFakeDb(seed());

app.listen(5055, () => console.log('[e2e] real API + in-memory data layer on http://localhost:5055'));
