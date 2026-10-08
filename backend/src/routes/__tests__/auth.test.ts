import request from 'supertest';
import app from '../../app';

// authLimiter allows 5 requests / 15min on this route. Every case below is
// deliberately an invalid payload so none of them reach the DB-dependent
// controller — this suite only exercises validation + rate limiting.
describe('POST /api/auth/login — validation & rate limiting', () => {
  it('rejects a missing body', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation failed/i);
  });

  it('rejects an invalid email format', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'x' })).status).toBe(400);
  });

  it('rejects a missing password', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'admin@example.com' })).status).toBe(400);
  });

  it('rejects an empty-string password', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: '' })).status).toBe(400);
  });

  it('rejects a fifth invalid attempt still as a 400 (limit not yet hit)', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'bad', password: '' })).status).toBe(400);
  });

  it('the 6th request in the window is rate-limited (429), before validation even runs', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/too many/i);
  });
});

describe('GET /api/auth/me — requires a session', () => {
  it('rejects with 401 when no session cookie is present', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('rejects with 401 for a garbage session cookie', async () => {
    expect((await request(app).get('/api/auth/me').set('Cookie', ['bp_session=not-a-real-jwt'])).status).toBe(401);
  });
});
