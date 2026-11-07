import request from 'supertest';
import app from '../../app';

describe('API-wide rate limit', () => {
  const saved = process.env.API_RATE_LIMIT;
  afterEach(() => {
    if (saved === undefined) delete process.env.API_RATE_LIMIT;
    else process.env.API_RATE_LIMIT = saved;
  });

  it('allows the configured number of requests per address, then answers 429 with Retry-After', async () => {
    process.env.API_RATE_LIMIT = '3';
    const ip = '10.77.0.1';
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) statuses.push((await request(app).get('/api/no-such-route').set('X-Forwarded-For', ip)).status);
    expect(statuses).toEqual([404, 404, 404, 429]);

    const blocked = await request(app).get('/api/no-such-route').set('X-Forwarded-For', ip);
    expect(blocked.headers['retry-after']).toBeDefined();
    // Another address has its own budget.
    expect((await request(app).get('/api/no-such-route').set('X-Forwarded-For', '10.77.0.2')).status).toBe(404);
  });

  it('is generous by default (shared campus or office addresses), and ignores a nonsense setting', async () => {
    process.env.API_RATE_LIMIT = 'not-a-number';
    const ip = '10.77.0.3';
    for (let i = 0; i < 12; i += 1) expect((await request(app).get('/api/no-such-route').set('X-Forwarded-For', ip)).status).toBe(404);
  });
});
