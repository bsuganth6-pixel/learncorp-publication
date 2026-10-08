import request from 'supertest';
import app from '../../app';

// Every mutating / admin-only route must reject an unauthenticated request
// before it ever reaches a controller (the API is the real security boundary;
// the frontend only hides these routes).
describe('admin routes reject unauthenticated requests', () => {
  const ID = '000000000000000000000000';
  const cases: Array<[string, string]> = [
    ['get', '/api/books/admin/all'],
    ['get', `/api/books/admin/${ID}`],
    ['post', '/api/books'],
    ['patch', `/api/books/${ID}`],
    ['delete', `/api/books/${ID}`],
    ['post', `/api/books/${ID}/reviews`],
    ['delete', `/api/books/${ID}/reviews/0`],
    ['post', '/api/authors'],
    ['patch', `/api/authors/${ID}`],
    ['delete', `/api/authors/${ID}`],
    ['get', '/api/manuscripts'],
    ['get', `/api/manuscripts/${ID}`],
    ['patch', `/api/manuscripts/${ID}/status`],
    ['get', `/api/manuscripts/${ID}/file-url`],
    ['post', '/api/manuscripts/uploads/image'],
    ['get', '/api/contact'],
    ['patch', `/api/contact/${ID}/read`],
    ['delete', `/api/contact/${ID}`],
    ['get', '/api/testimonials/admin/all'],
    ['post', '/api/testimonials'],
    ['patch', `/api/testimonials/${ID}`],
    ['delete', `/api/testimonials/${ID}`],
    ['get', '/api/dashboard/stats'],
    ['post', '/api/auth/logout'],
    ['get', '/api/auth/me'],
  ];

  it.each(cases)('%s %s -> 401 without a session', async (method, path) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (request(app) as any)[method](path);
    expect(res.status).toBe(401);
  });
});
