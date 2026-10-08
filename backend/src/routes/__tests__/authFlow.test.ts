/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { installFakeDb, seed, ADMIN, ADMIN_PASSWORD, adminCookie } from '../../testing/fakeDb';
import { User } from '../../models/User';

// Real routers/controllers/middleware; only the data layer is in-memory.
// Login budget: authLimiter allows 5 per window per test file — this file uses 3.
let fake: ReturnType<typeof installFakeDb>;
beforeAll(() => { fake = installFakeDb(seed()); });
afterAll(() => fake.restore());

const secret = () => process.env.JWT_SECRET as string;
const cookieOf = (token: string) => `bp_session=${token}`;

describe('login', () => {
  it('succeeds with the right credentials: session cookie is httpOnly + SameSite=Strict, body has no password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: ADMIN.id, name: ADMIN.name, email: ADMIN.email, role: ADMIN.role });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);

    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(setCookie).toMatch(/bp_session=[^;]+/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).not.toMatch(/Secure/i); // NODE_ENV=test; production sets it (see generateToken.test.ts)
    expect(setCookie).not.toMatch(/Domain=/i); // host-only cookie
  });

  it('wrong password and unknown email get the SAME 401 (no user enumeration)', async () => {
    const wrongPw = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: 'nope-nope-nope' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'whatever12' });
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body.message).toBe(unknown.body.message);
  });
});

describe('session handling', () => {
  it('a valid session reaches /me and an admin-only route', async () => {
    const me = await request(app).get('/api/auth/me').set('Cookie', adminCookie());
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(ADMIN.email);
    const stats = await request(app).get('/api/dashboard/stats').set('Cookie', adminCookie());
    expect(stats.status).toBe(200);
    expect(stats.body.data.manuscripts).toMatchObject({ Submitted: 1, 'Under Review': 1 });
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = jwt.sign({ id: ADMIN.id, role: 'superadmin' }, 'attacker-secret', { expiresIn: '1h' });
    expect((await request(app).get('/api/auth/me').set('Cookie', cookieOf(forged))).status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ id: ADMIN.id, role: 'superadmin' }, secret(), { expiresIn: -10 });
    expect((await request(app).get('/api/auth/me').set('Cookie', cookieOf(expired))).status).toBe(401);
  });

  it('rejects an unsigned (alg=none) token', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: ADMIN.id, role: 'superadmin' })}.`;
    expect((await request(app).get('/api/auth/me').set('Cookie', cookieOf(none))).status).toBe(401);
  });

  it('rejects a valid token whose account no longer exists', async () => {
    const ghost = jwt.sign({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', role: 'superadmin' }, secret(), { expiresIn: '1h' });
    expect((await request(app).get('/api/auth/me').set('Cookie', cookieOf(ghost))).status).toBe(401);
  });

  it('enforces roles server-side: an authenticated user with an unexpected role gets 403', async () => {
    const spy = jest.spyOn(User, 'findById').mockResolvedValueOnce({ ...ADMIN, _id: ADMIN.id, role: 'editor' } as any);
    const res = await request(app).get('/api/dashboard/stats').set('Cookie', adminCookie());
    expect(res.status).toBe(403);
    spy.mockRestore();
  });

  it('logout clears the cookie', async () => {
    const res = await request(app).post('/api/auth/logout').set('Cookie', adminCookie());
    expect(res.status).toBe(200);
    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(setCookie).toMatch(/bp_session=;/);
    expect(setCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
  });
});
