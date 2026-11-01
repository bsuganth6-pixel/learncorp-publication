/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../../app';
import { installFakeDb, seed } from '../../testing/fakeDb';

let fake: ReturnType<typeof installFakeDb>;
beforeAll(() => { fake = installFakeDb(seed()); });
afterAll(() => fake.restore());

describe('GET /api/authors (public list)', () => {
  it('lists authors with pagination metadata', async () => {
    const res = await request(app).get('/api/authors?limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2 });
  });

  it('searches by name, case-insensitively', async () => {
    const res = await request(app).get('/api/authors?search=JANE');
    expect(res.status).toBe(200);
    expect(res.body.data.map((a: any) => a.name)).toEqual(['Jane Doe']);
  });

  it('matches regex metacharacters literally instead of crashing or over-matching', async () => {
    for (const search of ['(', '[', '.*', 'a+(b', '\\']) {
      const res = await request(app).get('/api/authors').query({ search });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]); // none of these literal strings is in any author's name
    }
  });

  it('rejects malformed query parameters with 400 instead of a 500', async () => {
    for (const qs of ['page=0', 'page=-3', 'page=abc', 'limit=0', 'limit=500', 'search[]=a&search[]=b', 'search[x]=y']) {
      const res = await request(app).get(`/api/authors?${qs}`);
      expect([qs, res.status]).toEqual([qs, 400]);
      expect(res.body.success).toBe(false);
    }
  });
});
