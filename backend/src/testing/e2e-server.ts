/* eslint-disable @typescript-eslint/no-explicit-any */
// Boots the REAL Express app on :5055 against a REAL MongoDB-compatible database, reset and seeded with
// sample data on every start, with Cloudinary/S3 stubbed and outgoing email captured at /__dev/outbox.
// Dev/test only — never part of the production build.
import './e2e-env';
import './e2e-stubs'; // must come before the app is imported
import express from 'express';
import mongoose from 'mongoose';
import app from '../app';
import { seed, ADMIN, ADMIN_PASSWORD } from './fakeDb';
import { prepareDatabase } from '../config/db';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { AuthToken } from '../models/AuthToken';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { Manuscript } from '../models/Manuscript';
import { Book } from '../models/Book';
import { Author } from '../models/Author';
import { Testimonial } from '../models/Testimonial';
import { ContactMessage } from '../models/ContactMessage';
import { getTestOutbox, clearTestOutbox } from '../services/emailService';

const ID_FIELDS = new Set(['_id', 'author', 'book', 'user']);
const DATE_FIELDS = new Set(['createdAt', 'updatedAt', 'publicationDate']);

/** The sample data uses 24-hex strings for ids and ISO strings for dates; the driver needs real types. */
function typed(value: any, key = ''): any {
  if (Array.isArray(value)) return value.map((v) => (key === 'authors' ? new mongoose.Types.ObjectId(v) : typed(v)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typed(v, k)]));
  if (typeof value === 'string' && ID_FIELDS.has(key) && /^[0-9a-f]{24}$/.test(value)) return new mongoose.Types.ObjectId(value);
  if (typeof value === 'string' && DATE_FIELDS.has(key)) return new Date(value);
  return value;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/learncorp_e2e';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  await Promise.all([User, Session, AuthToken, AuditLog, Notification, Manuscript, Book, Author, Testimonial, ContactMessage].map((m) => m.init()));
  await prepareDatabase();

  const data = seed();
  const insert = async (model: { collection: { insertMany: (d: any[]) => Promise<unknown> } }, docs: any[]) => {
    if (docs.length) await model.collection.insertMany(docs.map((d) => typed(d)));
  };
  await insert(Author, data.authors);
  await insert(Book, data.books);
  await insert(Testimonial, data.testimonials);
  await insert(ContactMessage, data.messages);
  await insert(Manuscript, data.manuscripts.map((m) => ({ manuscriptFileKey: 'seed/none.pdf', manuscriptFileUrl: 'https://storage.invalid/seed/none.pdf', ...m })));

  // The one administrator the browser checks sign in as.
  await User.create({ name: ADMIN.name, email: ADMIN.email, password: ADMIN_PASSWORD, role: 'superadmin', emailVerified: true });

  // Dev-only window onto captured email, so browser tests can follow confirmation and reset links.
  // It lives on an outer app: the real app ends in a 404 handler, so routes can't be added after it.
  const outer = express();
  outer.get('/__dev/outbox', (req, res) => {
    const to = String(req.query.to || '');
    res.json(getTestOutbox().filter((m) => !to || m.to === to));
  });
  outer.delete('/__dev/outbox', (_req, res) => { clearTestOutbox(); res.json({ ok: true }); });
  outer.use(app);

  outer.listen(5055, () => console.log(`[e2e] real API + real database (${uri}) on http://localhost:5055`));
}

main().catch((err) => { console.error('[e2e] could not start:', err.message); process.exit(1); });
