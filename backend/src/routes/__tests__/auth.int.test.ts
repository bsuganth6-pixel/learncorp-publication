/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import { AuthToken } from '../../models/AuthToken';
import { AuditLog } from '../../models/AuditLog';
import { hashToken } from '../../utils/tokens';
import { hashPassword } from '../../utils/password';
import {
  startTestDatabase, stopTestDatabase, client, cookieFrom, setCookies, createUser, signIn, authorSession, adminSession,
  emailsTo, latestTokenFor, clearTestOutbox, drainBackground, freshIp, STRONG_PASSWORD,
} from '../../testing/integration';

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
beforeEach(clearTestOutbox);

let seq = 0;
const uniqueEmail = (tag = 'u') => `${tag}${Date.now()}${++seq}@example.com`;
const registration = (overrides: Record<string, unknown> = {}) => ({
  name: 'Asha Verma', email: uniqueEmail('reg'), phone: '9876543210', password: STRONG_PASSWORD,
  confirmPassword: STRONG_PASSWORD, acceptTerms: true, ...overrides,
});
const sessionRowFor = (cookie: string) => Session.findOne({ tokenHash: hashToken(cookie.split('=')[1]) });

describe('registration', () => {
  it('creates an author, signs them in, and sends a confirmation email', async () => {
    const body = registration();
    const res = await client().post('/api/auth/register').send(body);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: body.email, role: 'author', emailVerified: false, status: 'active' });
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/i);
    expect(res.body.emailSent).toBe(true);

    const cookies = setCookies(res);
    const session = cookies.find((c) => c.startsWith('bp_session='))!;
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(session).not.toMatch(/Max-Age|Expires/i); // browser-session cookie unless "remember me"
    expect(cookies.find((c) => c.startsWith('bp_auth='))).toMatch(/^bp_auth=author/);

    const mails = await emailsTo(body.email);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/confirm your email/i);
    expect(mails[0].html).toContain('/verify-email?token=');
  });

  it('stores a bcrypt hash, never the password, and only hashes of tokens', async () => {
    const body = registration();
    const res = await client().post('/api/auth/register').send(body);
    const stored = await User.findOne({ email: body.email }).select('+password');
    expect(stored!.password).toMatch(/^\$2[aby]\$/);
    expect(stored!.password).not.toContain(body.password);

    const cookie = cookieFrom(res)!;
    expect(await Session.countDocuments({ tokenHash: cookie.split('=')[1] })).toBe(0); // raw token is not stored
    expect(await sessionRowFor(cookie)).not.toBeNull(); // its hash is

    const emailToken = await latestTokenFor(body.email);
    expect(await AuthToken.countDocuments({ tokenHash: emailToken })).toBe(0);
    expect(await AuthToken.countDocuments({ tokenHash: hashToken(emailToken) })).toBe(1);
  });

  it('ignores any attempt to choose a role or pre-verify the account', async () => {
    const body = registration({ role: 'superadmin', status: 'suspended', emailVerified: true, isAdmin: true });
    const res = await client().post('/api/auth/register').send(body);
    expect(res.status).toBe(201);
    const stored = await User.findOne({ email: body.email });
    expect(stored).toMatchObject({ role: 'author', status: 'active', emailVerified: false });
  });

  it('rejects a duplicate email, case-insensitively', async () => {
    const first = registration({ email: uniqueEmail('dup').toLowerCase() });
    expect((await client().post('/api/auth/register').send(first)).status).toBe(201);
    const again = await client().post('/api/auth/register').send({ ...first, email: first.email.toUpperCase() });
    expect(again.status).toBe(409);
    expect(await User.countDocuments({ email: first.email })).toBe(1);
  });

  it.each([
    ['too short', 'Abc12345'],
    ['no digit', 'abcdefghijklmn'],
    ['no letter', '12345678901234'],
    ['too common', 'password123'],
    ['over 72 bytes', `${'a1'.repeat(37)}`],
  ])('rejects a weak password (%s)', async (_label, password) => {
    const res = await client().post('/api/auth/register').send(registration({ password, confirmPassword: password }));
    expect(res.status).toBe(400);
    expect(res.body.details.password).toBeDefined();
  });

  it('rejects mismatched confirmation, missing terms and a malformed email, naming the field', async () => {
    const mismatch = await client().post('/api/auth/register').send(registration({ confirmPassword: 'Different-Pass-99' }));
    expect(mismatch.body.details.confirmPassword).toBeDefined();
    const terms = await client().post('/api/auth/register').send(registration({ acceptTerms: false }));
    expect(terms.body.details.acceptTerms).toBeDefined();
    const mail = await client().post('/api/auth/register').send(registration({ email: 'not-an-email' }));
    expect(mail.body.details.email).toBeDefined();
  });

  it('refuses a password that is the email address', async () => {
    const email = `${'x'.repeat(10)}1@example.com`;
    const res = await client().post('/api/auth/register').send(registration({ email, password: email, confirmPassword: email }));
    expect(res.status).toBe(400);
  });
});

describe('email confirmation', () => {
  it('confirms once; the link cannot be replayed', async () => {
    const body = registration();
    await client().post('/api/auth/register').send(body);
    const token = await latestTokenFor(body.email);

    const first = await client().post('/api/auth/verify-email').send({ token });
    expect(first.status).toBe(200);
    expect(await User.findOne({ email: body.email })).toMatchObject({ emailVerified: true });

    expect((await client().post('/api/auth/verify-email').send({ token })).status).toBe(400);
  });

  it('rejects unknown, malformed and expired tokens', async () => {
    expect((await client().post('/api/auth/verify-email').send({ token: 'x'.repeat(43) })).status).toBe(400);
    expect((await client().post('/api/auth/verify-email').send({ token: 'short' })).status).toBe(400);

    const body = registration();
    await client().post('/api/auth/register').send(body);
    const token = await latestTokenFor(body.email);
    await AuthToken.updateOne({ tokenHash: hashToken(token) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await client().post('/api/auth/verify-email').send({ token })).status).toBe(400);
    expect(await User.findOne({ email: body.email })).toMatchObject({ emailVerified: false });
  });

  it('a resent link replaces the earlier one', async () => {
    const author = await authorSession({ verified: false });
    const oldToken = await (async () => {
      await client({ cookie: author.cookie }).post('/api/auth/resend-verification').send({});
      return latestTokenFor(author.email);
    })();
    clearTestOutbox();
    expect((await client({ cookie: author.cookie }).post('/api/auth/resend-verification').send({})).status).toBe(200);
    const newToken = await latestTokenFor(author.email);

    expect((await client().post('/api/auth/verify-email').send({ token: oldToken })).status).toBe(400);
    expect((await client().post('/api/auth/verify-email').send({ token: newToken })).status).toBe(200);
  });

  it('resend is a no-op for an already confirmed author and needs a session', async () => {
    const author = await authorSession({ verified: true });
    const res = await client({ cookie: author.cookie }).post('/api/auth/resend-verification').send({});
    expect(res.body.alreadyVerified).toBe(true);
    expect(await emailsTo(author.email)).toHaveLength(0);
    expect((await client().post('/api/auth/resend-verification').send({})).status).toBe(401);
  });
});

describe('author sign-in', () => {
  it('signs in with the right password', async () => {
    const { email, password } = await createUser();
    const res = await client().post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email, role: 'author' });
    expect(cookieFrom(res)).not.toBeNull();
    expect(await User.findOne({ email })).toMatchObject({ lastLoginAt: expect.any(Date) });
  });

  it('gives an identical answer for a wrong password, an unknown email, and an administrator account', async () => {
    const author = await createUser();
    const admin = await createUser({ role: 'admin' });
    const wrong = await client().post('/api/auth/login').send({ email: author.email, password: 'Wrong-Pass-123' });
    const unknown = await client().post('/api/auth/login').send({ email: uniqueEmail('ghost'), password: STRONG_PASSWORD });
    const adminViaAuthorForm = await client().post('/api/auth/login').send({ email: admin.email, password: admin.password });

    for (const res of [wrong, unknown, adminViaAuthorForm]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, message: 'Incorrect email or password' });
      expect(cookieFrom(res)).toBeNull();
    }
  });

  it('blocks a suspended author, but only after the password is proven right', async () => {
    const { email, password } = await createUser({ status: 'suspended' });
    const right = await client().post('/api/auth/login').send({ email, password });
    expect(right.status).toBe(403);
    expect(right.body.code).toBe('ACCOUNT_SUSPENDED');
    const wrong = await client().post('/api/auth/login').send({ email, password: 'Wrong-Pass-123' });
    expect(wrong.status).toBe(401);
  });

  it('"remember me" gives a longer-lived cookie; otherwise it is a browser-session cookie', async () => {
    const { email, password } = await createUser();
    const remembered = await client().post('/api/auth/login').send({ email, password, rememberMe: true });
    const cookie = setCookies(remembered).find((c) => c.startsWith('bp_session='))!;
    expect(cookie).toMatch(/Max-Age=\d+|Expires=/i);
    const row = await sessionRowFor(cookieFrom(remembered)!);
    expect(row!.persistent).toBe(true);
    expect(row!.expiresAt.getTime() - Date.now()).toBeGreaterThan(20 * 24 * 3600 * 1000);
  });

  it('a pre-existing account without the new fields (created before accounts existed) still works', async () => {
    const email = uniqueEmail('legacy');
    await User.collection.insertOne({ name: 'Old Admin', email, password: await hashPassword(STRONG_PASSWORD), role: 'superadmin', createdAt: new Date(), updatedAt: new Date() });
    const res = await client().post('/api/auth/admin/login').send({ email, password: STRONG_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: 'superadmin', status: 'active' });
  });

  it('validates input shape before touching the database', async () => {
    expect((await client().post('/api/auth/login').send({})).status).toBe(400);
    expect((await client().post('/api/auth/login').send({ email: { $gt: '' }, password: 'x' })).status).toBe(400);
    expect((await client().post('/api/auth/login').send({ email: 'a@b.co', password: 'p'.repeat(500) })).status).toBe(400);
  });
});

describe('sessions', () => {
  it('/me returns the signed-in user and the unread notification count', async () => {
    const author = await authorSession();
    const res = await client({ cookie: author.cookie }).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: author.email, role: 'author', unreadNotifications: 0 });
    expect(res.body.session.scope).toBe('author');
  });

  it('sign-out ends the session on the server and clears both cookies', async () => {
    const author = await authorSession();
    const out = await client({ cookie: author.cookie }).post('/api/auth/logout').send({});
    expect(out.status).toBe(200);
    expect(setCookies(out).filter((c) => /^(bp_session|bp_auth)=;/.test(c))).toHaveLength(2);

    expect((await sessionRowFor(author.cookie))!.revokedAt).toBeInstanceOf(Date);
    // The old cookie is dead even if someone kept a copy of it.
    expect((await client({ cookie: author.cookie }).get('/api/auth/me')).status).toBe(401);
  });

  it('sign-out is idempotent and tolerates stale or garbage cookies', async () => {
    expect((await client().post('/api/auth/logout').send({})).status).toBe(200);
    expect((await client({ cookie: 'bp_session=garbage' }).post('/api/auth/logout').send({})).status).toBe(200);
  });

  it('rejects a missing, garbage or forged cookie', async () => {
    expect((await client().get('/api/auth/me')).status).toBe(401);
    expect((await client({ cookie: 'bp_session=not-a-real-token' }).get('/api/auth/me')).status).toBe(401);
    // A JWT from the previous implementation is just an unknown token now.
    expect((await client({ cookie: 'bp_session=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEifQ.sig' }).get('/api/auth/me')).status).toBe(401);
  });

  it('expires after the idle timeout and after the absolute lifetime', async () => {
    const idle = await authorSession();
    await Session.updateOne({ tokenHash: hashToken(idle.cookie.split('=')[1]) }, { $set: { lastSeenAt: new Date(Date.now() - 3 * 3600 * 1000) } });
    expect((await client({ cookie: idle.cookie }).get('/api/auth/me')).status).toBe(401);

    const old = await authorSession();
    await Session.updateOne({ tokenHash: hashToken(old.cookie.split('=')[1]) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await client({ cookie: old.cookie }).get('/api/auth/me')).status).toBe(401);
  });

  it('a sign-in always issues a fresh token and retires the one the browser arrived with (no fixation)', async () => {
    const { email, password } = await createUser();
    const first = await signIn(email, password);
    const res = await client({ cookie: first }).post('/api/auth/login').send({ email, password });
    const second = cookieFrom(res)!;

    expect(second).not.toBe(first);
    expect((await client({ cookie: first }).get('/api/auth/me')).status).toBe(401);
    expect((await client({ cookie: second }).get('/api/auth/me')).status).toBe(200);
  });

  it('lists active sessions and lets a user end another one — but only their own', async () => {
    const { user, email, password } = await createUser();
    const laptop = await signIn(email, password);
    const phone = await signIn(email, password);
    const stranger = await authorSession();

    const list = await client({ cookie: laptop }).get('/api/auth/sessions');
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data.filter((s: any) => s.current)).toHaveLength(1);
    const other = list.body.data.find((s: any) => !s.current);

    // Someone else's session id: indistinguishable from a missing one.
    const strangerSession = await Session.findOne({ user: (await User.findOne({ email: stranger.email }))!._id });
    expect((await client({ cookie: laptop }).delete(`/api/auth/sessions/${strangerSession!.id}`)).status).toBe(404);
    expect((await client({ cookie: stranger.cookie }).get('/api/auth/me')).status).toBe(200);

    expect((await client({ cookie: laptop }).delete(`/api/auth/sessions/${other.id}`)).status).toBe(200);
    expect((await client({ cookie: phone }).get('/api/auth/me')).status).toBe(401);
    expect((await client({ cookie: laptop }).get('/api/auth/me')).status).toBe(200);
    expect(user).toBeDefined();
  });

  it('"sign out everywhere" ends every session including this one', async () => {
    const { email, password } = await createUser();
    const a = await signIn(email, password);
    const b = await signIn(email, password);
    expect((await client({ cookie: a }).post('/api/auth/logout-all').send({})).status).toBe(200);
    expect((await client({ cookie: a }).get('/api/auth/me')).status).toBe(401);
    expect((await client({ cookie: b }).get('/api/auth/me')).status).toBe(401);
  });

  it('keeps at most 10 live sessions per account by retiring the oldest', async () => {
    const { email, password, user } = await createUser();
    const cookies: string[] = [];
    for (let i = 0; i < 12; i += 1) cookies.push(await signIn(email, password));
    expect(await Session.countDocuments({ user: user._id, revokedAt: null })).toBe(10);
    expect((await client({ cookie: cookies[0] }).get('/api/auth/me')).status).toBe(401);
    expect((await client({ cookie: cookies[11] }).get('/api/auth/me')).status).toBe(200);
  });

  it('a suspended account loses its live sessions immediately', async () => {
    const author = await authorSession();
    await User.updateOne({ email: author.email }, { $set: { status: 'suspended' } });
    expect((await client({ cookie: author.cookie }).get('/api/auth/me')).status).toBe(401);
  });

  it('a session issued for one role stops working if the account\'s role changes', async () => {
    const author = await authorSession();
    await User.updateOne({ email: author.email }, { $set: { role: 'admin' } });
    expect((await client({ cookie: author.cookie }).get('/api/auth/me')).status).toBe(401);
  });
});

describe('password recovery', () => {
  const askForReset = async (email: string, ip = freshIp()) => {
    const res = await client({ ip }).post('/api/auth/forgot-password').send({ email });
    await drainBackground();
    return res;
  };

  it('answers identically for registered, unknown and suspended addresses, and mails only the first', async () => {
    const real = await createUser();
    const suspended = await createUser({ status: 'suspended' });
    const ghost = uniqueEmail('ghost');

    const responses = await Promise.all([askForReset(real.email), askForReset(ghost), askForReset(suspended.email)]);
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body).toEqual(responses[0].body);
    }
    expect(await emailsTo(real.email)).toHaveLength(1);
    expect(await emailsTo(ghost)).toHaveLength(0);
    expect(await emailsTo(suspended.email)).toHaveLength(0);
  });

  it('completes the full flow: validate link, set a new password, old password and old sessions stop working', async () => {
    const { email, password } = await createUser();
    const oldSession = await signIn(email, password);
    await askForReset(email);
    const token = await latestTokenFor(email);

    expect((await client().post('/api/auth/reset-password/validate').send({ token })).status).toBe(200);

    const newPassword = 'Another-Pass-5678';
    const reset = await client().post('/api/auth/reset-password').send({ token, password: newPassword, confirmPassword: newPassword });
    expect(reset.status).toBe(200);
    expect(cookieFrom(reset)).toBeNull(); // no automatic sign-in after a reset

    expect((await client({ cookie: oldSession }).get('/api/auth/me')).status).toBe(401);
    expect((await client().post('/api/auth/login').send({ email, password })).status).toBe(401);
    expect((await client().post('/api/auth/login').send({ email, password: newPassword })).status).toBe(200);

    // The link is single-use, and the account is told its password changed.
    expect((await client().post('/api/auth/reset-password').send({ token, password: newPassword, confirmPassword: newPassword })).status).toBe(400);
    expect((await client().post('/api/auth/reset-password/validate').send({ token })).status).toBe(400);
    const notices = (await emailsTo(email)).filter((m) => /password was changed/i.test(m.subject));
    expect(notices).toHaveLength(1);
  });

  it('a weak new password is refused without spending the link', async () => {
    const { email } = await createUser();
    await askForReset(email);
    const token = await latestTokenFor(email);
    const weak = await client().post('/api/auth/reset-password').send({ token, password: 'short1', confirmPassword: 'short1' });
    expect(weak.status).toBe(400);
    const ok = await client().post('/api/auth/reset-password').send({ token, password: 'Fresh-Pass-4321', confirmPassword: 'Fresh-Pass-4321' });
    expect(ok.status).toBe(200);
  });

  it('rejects expired, unknown and superseded links', async () => {
    const { email } = await createUser();
    await askForReset(email);
    const first = await latestTokenFor(email);
    clearTestOutbox();
    await askForReset(email);
    const second = await latestTokenFor(email);
    const body = (token: string) => ({ token, password: 'Fresh-Pass-4321', confirmPassword: 'Fresh-Pass-4321' });

    expect((await client().post('/api/auth/reset-password').send(body(first))).status).toBe(400); // superseded
    expect((await client().post('/api/auth/reset-password').send(body('z'.repeat(43)))).status).toBe(400); // unknown
    await AuthToken.updateOne({ tokenHash: hashToken(second) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await client().post('/api/auth/reset-password').send(body(second))).status).toBe(400); // expired
  });

  it('only a hash of the reset token is stored and the link lives 30 minutes', async () => {
    const { email } = await createUser();
    await askForReset(email);
    const token = await latestTokenFor(email);
    expect(await AuthToken.countDocuments({ tokenHash: token })).toBe(0);
    const row = await AuthToken.findOne({ tokenHash: hashToken(token) });
    expect(row!.type).toBe('password_reset');
    const minutes = (row!.expiresAt.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(28);
    expect(minutes).toBeLessThanOrEqual(30);
  });

  it('a reset also proves mailbox ownership for an unconfirmed account', async () => {
    const { email } = await createUser({ verified: false });
    await askForReset(email);
    const token = await latestTokenFor(email);
    await client().post('/api/auth/reset-password').send({ token, password: 'Fresh-Pass-4321', confirmPassword: 'Fresh-Pass-4321' });
    expect(await User.findOne({ email })).toMatchObject({ emailVerified: true });
  });

  it('limits how many reset emails one address can trigger', async () => {
    const { email } = await createUser();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) statuses.push((await client().post('/api/auth/forgot-password').send({ email })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

describe('changing the password while signed in', () => {
  it('requires the current password and reports the mistake on that field (not as a 401)', async () => {
    const author = await authorSession();
    const res = await client({ cookie: author.cookie }).post('/api/auth/change-password').send({
      currentPassword: 'Not-My-Pass-1', password: 'Brand-New-Pass-9', confirmPassword: 'Brand-New-Pass-9',
    });
    expect(res.status).toBe(400);
    expect(res.body.details.currentPassword).toBeDefined();
    expect((await client({ cookie: author.cookie }).get('/api/auth/me')).status).toBe(200);
  });

  it('keeps this device signed in and signs every other one out', async () => {
    const { email, password } = await createUser();
    const here = await signIn(email, password);
    const elsewhere = await signIn(email, password);
    const res = await client({ cookie: here }).post('/api/auth/change-password').send({
      currentPassword: password, password: 'Brand-New-Pass-9', confirmPassword: 'Brand-New-Pass-9',
    });
    expect(res.status).toBe(200);
    expect((await client({ cookie: here }).get('/api/auth/me')).status).toBe(200);
    expect((await client({ cookie: elsewhere }).get('/api/auth/me')).status).toBe(401);
    expect((await client().post('/api/auth/login').send({ email, password: 'Brand-New-Pass-9' })).status).toBe(200);
  });

  it('rejects reusing the current password and weak passwords', async () => {
    const author = await authorSession();
    const same = await client({ cookie: author.cookie }).post('/api/auth/change-password').send({
      currentPassword: author.password, password: author.password, confirmPassword: author.password,
    });
    expect(same.status).toBe(400);
    const weak = await client({ cookie: author.cookie }).post('/api/auth/change-password').send({
      currentPassword: author.password, password: 'weak', confirmPassword: 'weak',
    });
    expect(weak.status).toBe(400);
  });
});

describe('profile', () => {
  it('updates name, phone, bio and website — and nothing else', async () => {
    const author = await authorSession();
    const res = await client({ cookie: author.cookie }).patch('/api/auth/profile').send({
      name: 'Asha V. Verma', phone: '+91 98765 43210', bio: 'Writes about rivers.', website: 'https://asha.example.com',
      email: 'hijack@example.com', role: 'superadmin', emailVerified: false, status: 'suspended',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Asha V. Verma', bio: 'Writes about rivers.', website: 'https://asha.example.com' });
    expect(await User.findOne({ _id: (await User.findOne({ email: author.email }))!._id })).toMatchObject({
      email: author.email, role: 'author', status: 'active', emailVerified: true,
    });
  });

  it('rejects an invalid website and an empty update; needs a session', async () => {
    const author = await authorSession();
    expect((await client({ cookie: author.cookie }).patch('/api/auth/profile').send({ website: 'javascript:alert(1)' })).status).toBe(400);
    expect((await client({ cookie: author.cookie }).patch('/api/auth/profile').send({})).status).toBe(400);
    expect((await client().patch('/api/auth/profile').send({ name: 'Nobody' })).status).toBe(401);
  });
});

describe('administrator sign-in is separate from author sign-in', () => {
  it('signs an admin in with a strict, short-lived, non-persistent session and audits it', async () => {
    const { email, password } = await createUser({ role: 'admin' });
    const res = await client().post('/api/auth/admin/login').send({ email, password, rememberMe: true });
    expect(res.status).toBe(200);
    const cookie = setCookies(res).find((c) => c.startsWith('bp_session='))!;
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).not.toMatch(/Max-Age/i);

    const row = await sessionRowFor(cookieFrom(res)!);
    expect(row).toMatchObject({ scope: 'admin', persistent: false });
    expect(row!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(8 * 3600 * 1000);

    const entry = await AuditLog.findOne({ action: 'auth.admin_login', actorEmail: email });
    expect(entry).not.toBeNull();
  });

  it('refuses author credentials, and audits the failed attempt without recording the password', async () => {
    const author = await createUser({ role: 'author' });
    const res = await client().post('/api/auth/admin/login').send({ email: author.email, password: author.password });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password');

    const entry = await AuditLog.findOne({ action: 'auth.admin_login_failed', actorEmail: author.email });
    expect(entry).not.toBeNull();
    expect(JSON.stringify(entry!.toObject())).not.toContain(author.password);
  });

  it('records the administrator sign-out', async () => {
    const admin = await adminSession();
    await client({ cookie: admin.cookie }).post('/api/auth/logout').send({});
    expect(await AuditLog.findOne({ action: 'auth.admin_logout', actorEmail: admin.email })).not.toBeNull();
  });
});

describe('brute-force protection', () => {
  it('throttles repeated failures from one address, but never counts successful sign-ins', async () => {
    const ip = freshIp();
    const { email, password } = await createUser();
    for (let i = 0; i < 12; i += 1) {
      expect((await client({ ip }).post('/api/auth/login').send({ email, password })).status).toBe(200);
    }
    const failures: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      failures.push((await client({ ip }).post('/api/auth/login').send({ email: uniqueEmail('x'), password: 'Wrong-Pass-1' })).status);
    }
    expect(failures.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(failures[10]).toBe(429);
  });

  it('throttles one account across many addresses; other accounts are unaffected', async () => {
    const target = await createUser();
    const bystander = await createUser();
    for (let i = 0; i < 8; i += 1) {
      expect((await client().post('/api/auth/login').send({ email: target.email, password: 'Wrong-Pass-1' })).status).toBe(401);
    }
    // From a brand-new address, even the correct password is now held back for this account…
    expect((await client().post('/api/auth/login').send({ email: target.email, password: target.password })).status).toBe(429);
    // …while everyone else signs in normally.
    expect((await client().post('/api/auth/login').send({ email: bystander.email, password: bystander.password })).status).toBe(200);
  });

  it('is stricter for the administrator sign-in', async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      statuses.push((await client({ ip }).post('/api/auth/admin/login').send({ email: uniqueEmail('a'), password: 'Wrong-Pass-1' })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 401, 429]);
  });

  it('limits registrations per address', async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await client({ ip }).post('/api/auth/register').send(registration())).status);
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('cross-site request protection', () => {
  it('rejects a state-changing request that carries the session cookie but not our header', async () => {
    const author = await authorSession();
    const res = await client({ cookie: author.cookie, noCsrfHeader: true }).post('/api/auth/logout').send({});
    expect(res.status).toBe(403);
    expect((await client({ cookie: author.cookie }).get('/api/auth/me')).status).toBe(200); // still signed in
  });

  it('rejects a request whose Origin is another site, with or without a cookie', async () => {
    const author = await authorSession();
    const evil = 'https://evil.example';
    expect((await client({ cookie: author.cookie, origin: evil }).post('/api/auth/logout').send({})).status).toBe(403);
    expect((await client({ origin: evil }).post('/api/auth/login').send({ email: author.email, password: author.password })).status).toBe(403);
  });

  it('accepts the real site origin, and ignores safe methods', async () => {
    const author = await authorSession();
    expect((await client({ cookie: author.cookie, origin: 'http://localhost:3000' }).post('/api/auth/logout').send({})).status).toBe(200);
    expect((await client({ origin: 'https://evil.example' }).get('/api/books')).status).not.toBe(403);
  });
});

describe('role-based access control on the server', () => {
  const adminOnlyRoutes: Array<[string, string]> = [
    ['get', '/api/users'], ['get', '/api/audit-logs'], ['get', '/api/manuscripts'], ['get', '/api/dashboard/stats'],
    ['get', '/api/contact'], ['get', '/api/books/admin/all'],
    ['patch', '/api/manuscripts/aaaaaaaaaaaaaaaaaaaaaaaa/status'], ['post', '/api/manuscripts/aaaaaaaaaaaaaaaaaaaaaaaa/publish'],
    ['post', '/api/books'], ['delete', '/api/books/aaaaaaaaaaaaaaaaaaaaaaaa'],
  ];

  it.each(adminOnlyRoutes)('%s %s needs a signed-in administrator', async (method, url) => {
    const author = await authorSession();
    const anon = await (client() as any)[method](url).send({});
    expect(anon.status).toBe(401);
    const asAuthor = await (client({ cookie: author.cookie }) as any)[method](url).send({});
    expect(asAuthor.status).toBe(403);
  });

  it('an administrator cannot use the author-only endpoints', async () => {
    const admin = await adminSession();
    expect((await client({ cookie: admin.cookie }).get('/api/manuscripts/mine')).status).toBe(403);
    expect((await client({ cookie: admin.cookie }).post('/api/manuscripts').send({})).status).toBe(403);
  });

  it('an author session cannot be used to reach the admin dashboard even with the admin cookie name', async () => {
    const author = await authorSession();
    const res = await client({ cookie: author.cookie }).get('/api/users');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
