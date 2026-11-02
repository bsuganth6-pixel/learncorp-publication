import request from 'supertest';
import app from '../../app';

// Every protected route (admin-only, author-only, or any signed-in user) must reject an
// unauthenticated request before it reaches a controller: the API is the real security boundary,
// the frontend only hides things. Role checks with a real session live in the *.int.test.ts suites.
describe('protected routes reject unauthenticated requests', () => {
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
    ['post', `/api/manuscripts/${ID}/publish`],
    ['get', '/api/users'],
    ['get', `/api/users/${ID}`],
    ['patch', `/api/users/${ID}/status`],
    ['post', `/api/users/${ID}/revoke-sessions`],
    ['get', '/api/audit-logs'],
    // author-only
    ['post', '/api/manuscripts'],
    ['get', '/api/manuscripts/mine'],
    ['get', `/api/manuscripts/mine/${ID}`],
    ['get', `/api/manuscripts/mine/${ID}/file-url`],
    ['put', `/api/manuscripts/mine/${ID}`],
    // any signed-in user
    ['get', '/api/auth/me'],
    ['post', '/api/auth/logout-all'],
    ['patch', '/api/auth/profile'],
    ['post', '/api/auth/change-password'],
    ['post', '/api/auth/resend-verification'],
    ['get', '/api/auth/sessions'],
    ['delete', `/api/auth/sessions/${ID}`],
    ['get', '/api/notifications'],
    ['post', '/api/notifications/read-all'],
    ['patch', `/api/notifications/${ID}/read`],
  ];

  it.each(cases)('%s %s -> 401 without a session', async (method, path) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (request(app) as any)[method](path);
    expect(res.status).toBe(401);
  });
});
