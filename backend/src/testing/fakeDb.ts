/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory stand-in for the Mongoose data layer, so the REAL Express app
 * (routers, validators, auth, upload middleware, controllers) can be exercised
 * without a MongoDB server. It replaces the static query methods on the models
 * and implements just enough filtering/sorting/paging for what the controllers
 * ask for. It does NOT test MongoDB itself (indexes, text search, uniqueness).
 */
import jwt from 'jsonwebtoken';
import { Book, computeRatingsAvg } from '../models/Book';
import { Author } from '../models/Author';
import { Testimonial } from '../models/Testimonial';
import { Manuscript } from '../models/Manuscript';
import { ContactMessage } from '../models/ContactMessage';
import { User } from '../models/User';

type Doc = Record<string, any>;

export const ADMIN_PASSWORD = 'correct-horse-battery';
export const ADMIN = { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Test Admin', email: 'admin@example.com', role: 'superadmin' };

export interface FakeData {
  books: Doc[]; authors: Doc[]; testimonials: Doc[]; manuscripts: Doc[]; messages: Doc[];
}

const hex = (n: number) => n.toString(16).padStart(24, '0');
let counter = 1000;
const newId = () => hex(++counter);

function coverSvg(title: string, hue: number): string {
  const esc = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 40);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="hsl(${hue},45%,28%)"/>` +
    `<rect x="20" y="20" width="260" height="360" fill="none" stroke="hsl(${hue},60%,70%)" stroke-width="3"/>` +
    `<text x="150" y="200" fill="white" font-family="Georgia,serif" font-size="22" text-anchor="middle">${esc}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function seed(): FakeData {
  const authors: Doc[] = [
    { _id: hex(1), name: 'Jane Doe', slug: 'jane-doe', bio: 'Writes quiet, careful fiction.', qualifications: 'MA English', photoUrl: '', socialLinks: { website: 'https://example.com' }, createdAt: '2026-01-01T00:00:00.000Z' },
    { _id: hex(2), name: 'Ravi Kumar', slug: 'ravi-kumar', bio: 'Business writer.', qualifications: '', photoUrl: '', socialLinks: {}, createdAt: '2026-01-02T00:00:00.000Z' },
    { _id: hex(3), name: 'Mei Lin', slug: 'mei-lin', bio: '', qualifications: '', photoUrl: '', socialLinks: {}, createdAt: '2026-01-03T00:00:00.000Z' },
  ];
  const mk = (i: number, title: string, category: string, authorIdx: number[], price: number, format: string, status = 'published', reviews: Doc[] = []): Doc => ({
    _id: hex(100 + i), title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40),
    authors: authorIdx.map((a) => authors[a]._id), description: `${title} — a description long enough to look real on the page. `.repeat(2),
    isbn: `97812345678${String(i).padStart(2, '0')}`, category, language: 'English', publicationDate: `202${i % 6}-0${(i % 9) + 1}-15T00:00:00.000Z`,
    pages: 120 + i * 20, format, price, coverImageUrl: coverSvg(title, (i * 47) % 360), keywords: [category.toLowerCase(), 'sample'],
    publisher: 'LearnCorp Publication', tableOfContents: 'Chapter 1\nChapter 2\nChapter 3', reviews, ratingsAvg: computeRatingsAvg(reviews as { rating: number }[]),
    status, createdAt: `2026-02-0${(i % 9) + 1}T00:00:00.000Z`,
  });
  const books = [
    mk(1, 'The Quiet Orchard', 'Fiction', [0], 399, 'Paperback', 'published', [{ name: 'Asha', rating: 5, comment: 'Lovely.' }, { name: 'Tom', rating: 4, comment: 'Good read.' }]),
    mk(2, 'Ledger of Small Things', 'Business', [1], 549, 'Hardcover'),
    mk(3, 'Night Trains', 'Fiction', [0, 2], 299, 'eBook'),
    mk(4, 'Atlas of Habits', 'Self-Help', [1], 449, 'Paperback'),
    mk(5, 'Salt and Signal', 'Non-Fiction', [2], 650, 'Hardcover'),
    mk(6, 'Draft Not Yet Public', 'Fiction', [0], 199, 'PDF', 'draft'),
    mk(7, 'Danger </script><script>window.__pwned=1</script> Book', 'Fiction', [2], 250, 'Paperback'),
    mk(8, 'Counting Rivers', 'Poetry', [0], 350, 'Paperback'),
  ];
  return {
    books, authors,
    testimonials: [
      { _id: hex(201), name: 'Priya S', designation: 'Debut author', message: 'The team made publishing feel simple.', photoUrl: '', status: 'published', createdAt: '2026-03-01T00:00:00.000Z' },
      { _id: hex(202), name: 'Arun M', designation: '', message: 'Clear communication throughout.', photoUrl: '', status: 'published', createdAt: '2026-03-02T00:00:00.000Z' },
      { _id: hex(203), name: 'Hidden Person', designation: '', message: 'Not published yet.', photoUrl: '', status: 'unpublished', createdAt: '2026-03-03T00:00:00.000Z' },
    ],
    manuscripts: [
      { _id: hex(301), authorName: 'Sam Writer', email: 'sam@example.com', phone: '9876543210', bookTitle: 'First Draft', category: 'Fiction', language: 'English', pageCount: 210, description: 'A novel about a lighthouse keeper.', authorBio: 'Sam writes.', format: 'Paperback', manuscriptFileUrl: 'x', status: 'Submitted', createdAt: '2026-04-01T00:00:00.000Z' },
      { _id: hex(302), authorName: 'Lee Poet', email: 'lee@example.com', phone: '9123456780', bookTitle: 'Verses', category: 'Poetry', language: 'English', description: 'Collected poems of a decade.', authorBio: 'Lee writes poems.', format: 'eBook', manuscriptFileUrl: 'y', status: 'Under Review', createdAt: '2026-04-02T00:00:00.000Z' },
    ],
    messages: [
      { _id: hex(401), name: 'Visitor One', email: 'v1@example.com', phone: '', subject: 'Pricing?', message: 'How are services priced for a first book?', read: false, createdAt: '2026-05-01T00:00:00.000Z' },
      { _id: hex(402), name: 'Visitor Two', email: 'v2@example.com', phone: '', subject: 'Thanks', message: 'Thanks for the quick reply earlier.', read: true, createdAt: '2026-05-02T00:00:00.000Z' },
    ],
  };
}

// ---- tiny Mongo-ish matching / chainable query ----
function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter || {}).every(([key, cond]: [string, any]) => {
    if (cond === undefined) return true;
    if (key === '$text') {
      const q = String(cond.$search).toLowerCase();
      return [doc.title, ...(doc.keywords || []), doc.description].join(' ').toLowerCase().includes(q);
    }
    const value = doc[key];
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      return Object.entries(cond).every(([op, arg]: [string, any]) => {
        const v = arg instanceof Date ? new Date(value).getTime() : value;
        const a = arg instanceof Date ? arg.getTime() : arg;
        if (op === '$gte') return v >= a;
        if (op === '$lte') return v <= a;
        if (op === '$lt') return v < a;
        if (op === '$ne') return String(value) !== String(arg);
        if (op === '$regex') return new RegExp(arg, (cond as any).$options).test(String(value));
        return true;
      });
    }
    if (Array.isArray(value)) return value.map(String).includes(String(cond));
    return String(value) === String(cond);
  });
}

export function installFakeDb(data: FakeData): { restore: () => void; data: FakeData } {
  const originals: Array<() => void> = [];
  const patch = (target: any, name: string, fn: any) => {
    const prev = target[name];
    target[name] = fn;
    originals.push(() => { target[name] = prev; });
  };
  const authorById = (id: string) => data.authors.find((a) => String(a._id) === String(id));

  const query = (items: Doc[], single = false) => {
    let sortSpec: Record<string, 1 | -1> | undefined;
    let skipN = 0;
    let limitN = Infinity;
    let populate = false;
    const run = () => {
      let out = [...items];
      if (sortSpec) {
        const [[k, dir]] = Object.entries(sortSpec);
        out.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir);
      }
      out = out.slice(skipN, limitN === Infinity ? undefined : skipN + limitN);
      if (populate) out = out.map((d) => ({ ...d, authors: (d.authors || []).map((id: string) => authorById(id) || { _id: id }) }));
      return single ? out[0] ?? null : out;
    };
    const c: any = {
      sort(s: any) { sortSpec = s; return c; }, skip(n: number) { skipN = n; return c; }, limit(n: number) { limitN = n; return c; },
      select() { return c; }, lean() { return c; }, populate(path: string) { if (path === 'authors') populate = true; return c; },
      then(res: any, rej: any) { return Promise.resolve().then(run).then(res, rej); },
    };
    return c;
  };
  const list = (arr: Doc[]) => (filter: Doc = {}) => query(arr.filter((d) => matches(d, filter)));
  const one = (arr: Doc[], keyOf: (f: any) => Doc) => (f: any) => query(arr.filter((d) => matches(d, keyOf(f))), true);
  const count = (arr: Doc[]) => async (filter: Doc = {}) => arr.filter((d) => matches(d, filter)).length;
  const create = (arr: Doc[], extra: () => Doc = () => ({})) => async (payload: Doc) => {
    const doc = { _id: newId(), createdAt: new Date().toISOString(), ...extra(), ...payload };
    arr.push(doc);
    return doc;
  };
  const remove = (arr: Doc[]) => async (id: string) => {
    const i = arr.findIndex((d) => String(d._id) === String(id));
    return i === -1 ? null : arr.splice(i, 1)[0];
  };
  const update = (arr: Doc[]) => (id: string, changes: Doc) => {
    const doc = arr.find((d) => String(d._id) === String(id));
    if (doc) Object.assign(doc, changes);
    return query(doc ? [doc] : [], true);
  };

  patch(Book, 'find', list(data.books));
  patch(Book, 'countDocuments', count(data.books));
  patch(Book, 'findOne', one(data.books, (f) => f));
  patch(Book, 'findById', one(data.books, (id) => ({ _id: id })));
  patch(Book, 'exists', async (f: Doc) => (data.books.find((d) => matches(d, f)) ? { _id: 'x' } : null));
  patch(Book, 'create', create(data.books, () => ({ reviews: [], ratingsAvg: 0 })));
  patch(Book, 'findByIdAndDelete', remove(data.books));
  patch(Book, 'distinct', async (field: string, f: Doc) => [...new Set(data.books.filter((d) => matches(d, f)).map((d) => d[field]))]);

  patch(Author, 'find', list(data.authors));
  patch(Author, 'countDocuments', count(data.authors));
  patch(Author, 'findOne', one(data.authors, (f) => f));
  patch(Author, 'exists', async (f: Doc) => (data.authors.find((d) => matches(d, f)) ? { _id: 'x' } : null));
  patch(Author, 'create', create(data.authors));
  patch(Author, 'findByIdAndDelete', remove(data.authors));

  patch(Testimonial, 'find', list(data.testimonials));
  patch(Testimonial, 'countDocuments', count(data.testimonials));
  patch(Testimonial, 'create', create(data.testimonials));
  patch(Testimonial, 'findByIdAndUpdate', update(data.testimonials));
  patch(Testimonial, 'findByIdAndDelete', remove(data.testimonials));

  patch(Manuscript, 'find', list(data.manuscripts));
  patch(Manuscript, 'countDocuments', count(data.manuscripts));
  patch(Manuscript, 'findById', one(data.manuscripts, (id) => ({ _id: id })));
  patch(Manuscript, 'findByIdAndUpdate', update(data.manuscripts));
  patch(Manuscript, 'create', create(data.manuscripts, () => ({ status: 'Submitted' })));
  patch(Manuscript, 'aggregate', async () => {
    const counts: Record<string, number> = {};
    data.manuscripts.forEach((m) => { counts[m.status] = (counts[m.status] || 0) + 1; });
    return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
  });

  patch(ContactMessage, 'find', list(data.messages));
  patch(ContactMessage, 'countDocuments', count(data.messages));
  patch(ContactMessage, 'create', create(data.messages, () => ({ read: false })));
  patch(ContactMessage, 'findByIdAndUpdate', update(data.messages));
  patch(ContactMessage, 'findByIdAndDelete', remove(data.messages));

  const adminDoc = (withPassword: boolean) => ({
    ...ADMIN, _id: ADMIN.id,
    ...(withPassword ? { comparePassword: async (candidate: string) => candidate === ADMIN_PASSWORD } : {}),
  });
  patch(User, 'findOne', (f: Doc) => ({
    select: async () => (f.email === ADMIN.email ? adminDoc(true) : null),
    then: (res: any, rej: any) => Promise.resolve(f.email === ADMIN.email ? adminDoc(false) : null).then(res, rej),
  }));
  patch(User, 'findById', async (id: string) => (id === ADMIN.id ? adminDoc(false) : null));

  return { data, restore: () => originals.reverse().forEach((r) => r()) };
}

/** Cookie header for an authenticated admin (signed with the test JWT secret). */
export const adminCookie = (): string =>
  `${process.env.COOKIE_NAME || 'bp_session'}=${jwt.sign({ id: ADMIN.id, role: ADMIN.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' })}`;
