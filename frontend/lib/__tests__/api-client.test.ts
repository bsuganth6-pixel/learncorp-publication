import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The client picks its base URL when the module loads, so pretend to be a browser *before* importing it.
const dispatchEvent = vi.fn();
vi.stubGlobal('window', { dispatchEvent });
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let api: typeof import('../api-client');
beforeEach(async () => {
  api = await import('../api-client');
  fetchMock.mockReset();
  dispatchEvent.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe('browser requests', () => {
  it('go to the same-origin /api proxy with credentials and the CSRF header', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { id: '1' } }));
    await api.getMe();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/me');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-Requested-With']).toBe('LearnCorp');
  });

  it('send JSON bodies as JSON, and leave multipart uploads to the browser', async () => {
    fetchMock.mockResolvedValue(json(200, { success: true }));
    await api.login('a@example.com', 'pw');
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'a@example.com', password: 'pw', rememberMe: false });

    await api.resubmitManuscript('abc', new FormData());
    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
  });

  it('use separate endpoints for author and administrator sign-in', async () => {
    fetchMock.mockResolvedValue(json(200, { data: {} }));
    await api.login('a@example.com', 'pw');
    await api.adminLogin('a@example.com', 'pw');
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/api/auth/login', '/api/auth/admin/login']);
  });
});

describe('errors', () => {
  it('carry the status, the server message, a machine-readable code and per-field messages', async () => {
    fetchMock.mockResolvedValue(json(400, { success: false, message: 'Validation failed', code: 'X', details: { email: ['Enter a valid email'], password: ['Too short', 'ignored'] } }));
    const err = await api.register({ name: 'A', email: 'x', password: 'p', confirmPassword: 'p', acceptTerms: true }).catch((e) => e);
    expect(err).toBeInstanceOf(api.ApiClientError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('X');
    expect(err.fieldErrors).toEqual({ email: 'Enter a valid email', password: 'Too short' });
  });

  it('give an empty field map when the response has no field details', async () => {
    fetchMock.mockResolvedValue(json(500, { message: 'Boom' }));
    const err = await api.getMe().catch((e) => e);
    expect(err.fieldErrors).toEqual({});
    expect(err.message).toBe('Boom');
  });

  it('report an unreachable server as status 0 with a human message', async () => {
    fetchMock.mockRejectedValue(new TypeError('failed to fetch'));
    const err = await api.getMe().catch((e) => e);
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/could not reach the server/i);
  });
});

describe('session expiry', () => {
  it('announces a 401 from any ordinary call so the whole UI drops to signed-out', async () => {
    fetchMock.mockResolvedValue(json(401, { message: 'Your session has ended.' }));
    await api.getMySubmissions().catch(() => undefined);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect((dispatchEvent.mock.calls[0][0] as Event).type).toBe(api.UNAUTHORIZED_EVENT);
  });

  it('does not treat a wrong password at sign-in as an expired session', async () => {
    fetchMock.mockResolvedValue(json(401, { message: 'Incorrect email or password' }));
    await api.login('a@example.com', 'bad').catch(() => undefined);
    await api.adminLogin('a@example.com', 'bad').catch(() => undefined);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('does not announce other failures', async () => {
    fetchMock.mockResolvedValue(json(403, { message: 'nope' }));
    await api.getUsers().catch(() => undefined);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
