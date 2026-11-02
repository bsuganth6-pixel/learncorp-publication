import mongoose from 'mongoose';
import { Session } from '../models/Session';
import { AuthToken } from '../models/AuthToken';
import { User } from '../models/User';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('[db] MongoDB connection failed:', (err as Error).message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });
}

const DAY_SECONDS = 24 * 60 * 60;

/**
 * One-time-per-start housekeeping. Every step is idempotent, and none is fatal: the app rejects
 * expired sessions and tokens in code, so a failed TTL index only means old rows linger.
 */
export async function prepareDatabase(): Promise<void> {
  for (const [model, keepSeconds] of [[Session, 7 * DAY_SECONDS], [AuthToken, DAY_SECONDS]] as const) {
    try {
      await model.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: keepSeconds, name: 'expiresAt_ttl' });
    } catch (err) {
      console.warn(`[db] TTL index on ${model.collection.name} not created:`, (err as Error).message);
    }
  }

  // Accounts that predate roles and account status: they were all administrators.
  const now = new Date();
  await User.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
  await User.updateMany(
    { role: { $in: ['admin', 'superadmin'] }, emailVerified: { $exists: false } },
    { $set: { emailVerified: true, emailVerifiedAt: now } }
  );
}
