import {
  startTestDatabase, stopTestDatabase, client, authorSession, adminSession, createUser,
} from '../../testing/integration';

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);

describe('responses about a signed-in person are never cacheable', () => {
  it('authenticated endpoints send Cache-Control: private, no-store', async () => {
    const author = await authorSession();
    const admin = await adminSession();
    for (const [cookie, url] of [
      [author.cookie, '/api/auth/me'], [author.cookie, '/api/auth/sessions'], [author.cookie, '/api/notifications'],
      [author.cookie, '/api/manuscripts/mine'], [admin.cookie, '/api/users'], [admin.cookie, '/api/audit-logs'], [admin.cookie, '/api/manuscripts'],
    ]) {
      const res = await client({ cookie }).get(url);
      expect([url, res.status, res.headers['cache-control']]).toEqual([url, 200, 'private, no-store']);
    }
  });

  it('sign-in, sign-up and recovery responses are no-store', async () => {
    const { email, password } = await createUser();
    const login = await client().post('/api/auth/login').send({ email, password });
    expect(login.headers['cache-control']).toBe('no-store');
    expect((await client().post('/api/auth/forgot-password').send({ email })).headers['cache-control']).toBe('no-store');
    expect((await client().post('/api/auth/logout').send({})).headers['cache-control']).toBe('no-store');
  });

  it('the public catalogue is not forced uncacheable', async () => {
    expect(String((await client().get('/api/books')).headers['cache-control'] ?? '')).not.toMatch(/no-store/);
  });
});
