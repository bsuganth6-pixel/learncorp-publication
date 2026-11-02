/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Harness for the *.int.test.ts suites. These run the real Express app against a real
 * MongoDB-compatible server (MONGODB_TEST_URI, default mongodb://127.0.0.1:27017), each file in its
 * own throw-away database. Only outbound services are replaced: email goes to an in-memory outbox,
 * and S3/Cloudinary are mocked by the test files that upload.
 */
import mongoose from 'mongoose';
import request, { Test } from 'supertest';
import app from '../app';
import { User, UserRole, IUser } from '../models/User';
import { Session } from '../models/Session';
import { AuthToken } from '../models/AuthToken';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { Manuscript } from '../models/Manuscript';
import { Book } from '../models/Book';
import { Author } from '../models/Author';
import { getTestOutbox, clearTestOutbox, EmailMessage } from '../services/emailService';
import { drainBackground } from '../utils/background';

export const STRONG_PASSWORD = 'Sturdy-Pass-1234';

export async function startTestDatabase(): Promise<void> {
  const base = (process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017').replace(/\/$/, '');
  const dbName = `lc_test_${process.pid}_${Date.now()}`;
  try {
    await mongoose.connect(`${base}/${dbName}`, { serverSelectionTimeoutMS: 4000 });
  } catch (err) {
    throw new Error(
      `Integration tests need a MongoDB server at ${base} (set MONGODB_TEST_URI to point elsewhere). ${(err as Error).message}`
    );
  }
  // Build the unique indexes up front: several tests rely on them rejecting duplicates.
  await Promise.all([User, Session, AuthToken, AuditLog, Notification, Manuscript, Book, Author].map((m) => m.init()));
}

export async function stopTestDatabase(): Promise<void> {
  await drainBackground();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

let ipCounter = 0;
/** A unique client IP per call, so rate-limit buckets never leak between tests (the app trusts one proxy hop). */
export const freshIp = (): string => `10.${(++ipCounter >> 8) & 255}.${ipCounter & 255}.7`;

interface ClientOptions {
  cookie?: string;
  ip?: string;
  /** Omit the CSRF header (to prove the guard works). */
  noCsrfHeader?: boolean;
  origin?: string;
}

/** A browser-like caller: cookie, the CSRF header our frontend always sends, and its own IP. */
export function client(options: ClientOptions = {}) {
  const ip = options.ip ?? freshIp();
  const decorate = (test: Test): Test => {
    test.set('X-Forwarded-For', ip);
    if (!options.noCsrfHeader) test.set('X-Requested-With', 'LearnCorp');
    if (options.cookie) test.set('Cookie', options.cookie);
    if (options.origin) test.set('Origin', options.origin);
    return test;
  };
  return {
    ip,
    get: (url: string) => decorate(request(app).get(url)),
    post: (url: string) => decorate(request(app).post(url)),
    put: (url: string) => decorate(request(app).put(url)),
    patch: (url: string) => decorate(request(app).patch(url)),
    delete: (url: string) => decorate(request(app).delete(url)),
  };
}

export const setCookies = (res: { headers: Record<string, any> }): string[] => (res.headers['set-cookie'] as string[] | undefined) ?? [];

/** The "name=value" pair of a Set-Cookie header, ready to send back as a Cookie header. */
export function cookieFrom(res: { headers: Record<string, any> }, name = 'bp_session'): string | null {
  const raw = setCookies(res).find((c) => c.startsWith(`${name}=`));
  if (!raw) return null;
  const pair = raw.split(';')[0];
  return pair === `${name}=` ? null : pair;
}

export async function createUser(
  overrides: Partial<{ name: string; email: string; password: string; role: UserRole; verified: boolean; status: 'active' | 'suspended' }> = {}
): Promise<{ user: IUser; email: string; password: string }> {
  const email = overrides.email ?? `user${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = overrides.password ?? STRONG_PASSWORD;
  const user = await User.create({
    name: overrides.name ?? 'Test Person',
    email,
    password,
    role: overrides.role ?? 'author',
    status: overrides.status ?? 'active',
    emailVerified: overrides.verified ?? true,
  });
  return { user, email, password };
}

/** Signs in through the real endpoint and returns the session cookie. */
export async function signIn(email: string, password: string, opts: { admin?: boolean; ip?: string } = {}): Promise<string> {
  const res = await client({ ip: opts.ip }).post(opts.admin ? '/api/auth/admin/login' : '/api/auth/login').send({ email, password });
  const cookie = cookieFrom(res);
  if (res.status !== 200 || !cookie) throw new Error(`sign-in failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return cookie;
}

export async function authorSession(overrides: Parameters<typeof createUser>[0] = {}) {
  const account = await createUser({ ...overrides, role: 'author' });
  const cookie = await signIn(account.email, account.password);
  return { ...account, cookie };
}

export async function adminSession(overrides: Parameters<typeof createUser>[0] = {}) {
  const account = await createUser({ ...overrides, role: overrides.role ?? 'admin' });
  const cookie = await signIn(account.email, account.password, { admin: true });
  return { ...account, cookie };
}

/** Emails "sent" to an address, oldest first. Waits for background sends (forgot-password) to finish. */
export async function emailsTo(address: string): Promise<EmailMessage[]> {
  await drainBackground();
  return getTestOutbox().filter((m) => m.to === address);
}

/** The single-use token inside the link of the most recent email to `address`. */
export async function latestTokenFor(address: string): Promise<string> {
  const mails = await emailsTo(address);
  const match = mails[mails.length - 1]?.text.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`no email with a token link was sent to ${address}`);
  return match[1];
}

export { clearTestOutbox, drainBackground };
