/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../../app';
import { installFakeDb, seed, adminCookie } from '../../testing/fakeDb';

let fake: ReturnType<typeof installFakeDb>;
beforeAll(() => { fake = installFakeDb(seed()); });
afterAll(() => fake.restore());

const validBook = () => ({
  title: 'Brand New Title', authors: [fake.data.authors[0]._id], description: 'A proper description.',
  isbn: '9781111111111', category: 'Fiction', language: 'English', publicationDate: '2026-01-15', pages: 200,
  format: 'Paperback', price: 299, coverImageUrl: 'https://res.cloudinary.com/demo/image/upload/x.png',
  keywords: ['a', 'b'], status: 'draft',
});

describe('public listing', () => {
  it('only ever returns published books, even when ?status=draft is requested', async () => {
    const res = await request(app).get('/api/books?status=draft&limit=50');
    expect(res.status).toBe(200);
    expect(res.body.data.every((b: any) => b.status === 'published')).toBe(true);
    expect(res.body.data.some((b: any) => b.title.includes('Draft Not Yet'))).toBe(false);
  });

  it('applies category + price filters and populates authors', async () => {
    const res = await request(app).get('/api/books?category=Fiction&minPrice=250&maxPrice=400');
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const b of res.body.data) {
      expect(b.category).toBe('Fiction');
      expect(b.price).toBeGreaterThanOrEqual(250);
      expect(b.price).toBeLessThanOrEqual(400);
      expect(typeof b.authors[0].name).toBe('string');
    }
  });

  it('sorts by price and paginates', async () => {
    const asc = await request(app).get('/api/books?sort=price-asc&limit=3&page=1');
    const prices = asc.body.data.map((b: any) => b.price);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
    expect(asc.body.pagination).toMatchObject({ page: 1, limit: 3, total: 7, pages: 3 });
    const page3 = await request(app).get('/api/books?limit=3&page=3');
    expect(page3.body.data).toHaveLength(1);
  });

  it.each([
    ['limit above the cap', 'limit=500'],
    ['unknown sort', 'sort=password'],
    ['page 0', 'page=0'],
    ['Mongo operator injection in a filter', 'category[$ne]=x'],
  ])('rejects %s with 400 (not 500, not data)', async (_label, qs) => {
    const res = await request(app).get(`/api/books?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.data).toBeUndefined();
  });
});

describe('search (title, author, ISBN, category, keyword)', () => {
  const titles = async (q: string) => (await request(app).get(`/api/books?search=${encodeURIComponent(q)}&limit=50`)).body.data.map((b: any) => b.title);

  it('finds by title, case-insensitively', async () => {
    expect(await titles('quiet ORCHARD')).toEqual(['The Quiet Orchard']);
  });
  it('finds by ISBN', async () => {
    expect(await titles('9781234567805')).toEqual(['Salt and Signal']);
  });
  it('finds by author name', async () => {
    expect(await titles('ravi kumar')).toEqual(expect.arrayContaining(['Ledger of Small Things', 'Atlas of Habits']));
    expect((await titles('ravi kumar')).length).toBe(2);
  });
  it('finds by category and by keyword', async () => {
    expect(await titles('poetry')).toEqual(['Counting Rivers']);
    expect((await titles('sample')).length).toBe(7); // keyword on every published book, never the draft
  });
  it('never returns drafts, even when the term matches one', async () => {
    expect(await titles('Draft Not Yet')).toEqual([]);
  });
  it('treats regex metacharacters literally (no injection, no match-everything)', async () => {
    expect(await titles('.*')).toEqual([]);
    expect(await titles('(a+)+$')).toEqual([]);
  });
  it('rejects an over-long term and operator injection in the term', async () => {
    expect((await request(app).get(`/api/books?search=${'a'.repeat(101)}`)).status).toBe(400);
    expect((await request(app).get('/api/books?search[$ne]=x')).status).toBe(400);
  });
});

describe('book detail', () => {
  it('returns a published book with related titles excluding itself', async () => {
    const res = await request(app).get('/api/books/the-quiet-orchard');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('The Quiet Orchard');
    expect(res.body.related.every((b: any) => b.slug !== 'the-quiet-orchard' && b.category === 'Fiction')).toBe(true);
  });

  it('404s for drafts and unknown slugs alike (drafts are not discoverable)', async () => {
    expect((await request(app).get('/api/books/draft-not-yet-public')).status).toBe(404);
    expect((await request(app).get('/api/books/no-such-book')).status).toBe(404);
  });
});

describe('public stats', () => {
  it('returns real counts without exposing drafts', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ publishedBooks: 7, authors: 3, categories: 5 });
  });
});

describe('admin book management', () => {
  it('admin listing can see drafts', async () => {
    const res = await request(app).get('/api/books/admin/all?status=draft').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    expect(res.body.data.map((b: any) => b.status)).toEqual(['draft']);
  });

  it('creates a book; a duplicate title gets a unique slug; unknown fields are not mass-assigned', async () => {
    const first = await request(app).post('/api/books').set('Cookie', adminCookie()).send({ ...validBook(), slug: 'hacked', ratingsAvg: 5, _id: 'x' });
    expect(first.status).toBe(201);
    expect(first.body.data.slug).toBe('brand-new-title');
    expect(first.body.data.ratingsAvg).toBe(0);
    expect(first.body.data._id).not.toBe('x');

    const second = await request(app).post('/api/books').set('Cookie', adminCookie()).send({ ...validBook(), isbn: '9782222222222' });
    expect(second.body.data.slug).toBe('brand-new-title-1');
  });

  it('rejects invalid payloads with per-field details', async () => {
    const res = await request(app).post('/api/books').set('Cookie', adminCookie())
      .send({ ...validBook(), authors: [], isbn: '123', price: -5, coverImageUrl: 'not-a-url', format: 'Scroll' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(['authors', 'isbn', 'price', 'coverImageUrl', 'format']));
  });

  it('refuses to delete an author still credited on a book (409), allows deleting a free one', async () => {
    const blocked = await request(app).delete(`/api/authors/${fake.data.authors[0]._id}`).set('Cookie', adminCookie());
    expect(blocked.status).toBe(409);
    const created = await request(app).post('/api/authors').set('Cookie', adminCookie()).send({ name: 'Free Author' });
    expect(created.status).toBe(201);
    const ok = await request(app).delete(`/api/authors/${created.body.data._id}`).set('Cookie', adminCookie());
    expect(ok.status).toBe(200);
  });
});

describe('stored URLs must be http(s) (they end up in href/src attributes)', () => {
  it.each([
    ['author website', '/api/authors', () => ({ name: 'X', socialLinks: { website: 'javascript:alert(1)' } })],
    ['author photo', '/api/authors', () => ({ name: 'X', photoUrl: 'data:text/html,<script>alert(1)</script>' })],
    ['testimonial photo', '/api/testimonials', () => ({ name: 'X', message: 'm', photoUrl: 'javascript:alert(1)' })],
    ['book cover', '/api/books', () => ({ ...validBook(), coverImageUrl: 'javascript:alert(1)' })],
  ])('rejects a javascript:/data: URL in %s', async (_label, path, makeBody) => {
    const res = await request(app).post(path).set('Cookie', adminCookie()).send(makeBody());
    expect(res.status).toBe(400);
  });

  it('still accepts normal https links and an empty string for "not set"', async () => {
    const ok = await request(app).post('/api/authors').set('Cookie', adminCookie())
      .send({ name: 'Linked Author', photoUrl: '', socialLinks: { website: 'https://example.com', twitter: '' } });
    expect(ok.status).toBe(201);
  });
});

describe('admin: reviews and updates', () => {
  const bookId = () => fake.data.books.find((b: any) => b.slug === 'the-quiet-orchard')!._id;

  it('adds a curated review, then removes it by index', async () => {
    const before = fake.data.books.find((b: any) => b._id === bookId())!.reviews.length;
    const added = await request(app).post(`/api/books/${bookId()}/reviews`).set('Cookie', adminCookie()).send({ name: 'Reader', rating: 4, comment: 'Worth it.' });
    expect(added.status).toBe(201);
    expect(added.body.data.reviews).toHaveLength(before + 1);
    const removed = await request(app).delete(`/api/books/${bookId()}/reviews/${before}`).set('Cookie', adminCookie());
    expect(removed.status).toBe(200);
    expect(removed.body.data.reviews).toHaveLength(before);
  });

  it.each([
    ['rating above 5', { name: 'R', rating: 9, comment: 'x' }],
    ['rating below 1', { name: 'R', rating: 0, comment: 'x' }],
    ['missing comment', { name: 'R', rating: 3 }],
  ])('rejects a review with %s', async (_l, body) => {
    expect((await request(app).post(`/api/books/${bookId()}/reviews`).set('Cookie', adminCookie()).send(body)).status).toBe(400);
  });

  it('404s when removing a review index that does not exist', async () => {
    expect((await request(app).delete(`/api/books/${bookId()}/reviews/99`).set('Cookie', adminCookie())).status).toBe(404);
  });

  it('updates a book, regenerating the slug when the title changes; rejects an invalid partial update', async () => {
    const created = await request(app).post('/api/books').set('Cookie', adminCookie()).send({ ...validBook(), title: 'Before Rename', isbn: '9784444444444' });
    const id = created.body.data._id;
    const ok = await request(app).patch(`/api/books/${id}`).set('Cookie', adminCookie()).send({ title: 'After Rename', price: 123 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.slug).toBe('after-rename');
    expect(ok.body.data.price).toBe(123);
    const bad = await request(app).patch(`/api/books/${id}`).set('Cookie', adminCookie()).send({ price: -1 });
    expect(bad.status).toBe(400);
  });

  it('deletes a book and 404s on a second delete', async () => {
    const created = await request(app).post('/api/books').set('Cookie', adminCookie()).send({ ...validBook(), title: 'Short Lived', isbn: '9785555555555' });
    const id = created.body.data._id;
    expect((await request(app).delete(`/api/books/${id}`).set('Cookie', adminCookie())).status).toBe(200);
    expect((await request(app).delete(`/api/books/${id}`).set('Cookie', adminCookie())).status).toBe(404);
  });
});
