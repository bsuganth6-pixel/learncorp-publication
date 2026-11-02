/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import { AuditLog } from '../../models/AuditLog';
import { Notification } from '../../models/Notification';
import { Manuscript } from '../../models/Manuscript';
import {
  startTestDatabase, stopTestDatabase, client, createUser, signIn, authorSession, adminSession, clearTestOutbox,
} from '../../testing/integration';

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
beforeEach(clearTestOutbox);

const idOf = async (email: string) => String((await User.findOne({ email }))!._id);

describe('user management', () => {
  it('lists accounts with filters, pagination and submission counts — never password data', async () => {
    const admin = await adminSession();
    const writer = await createUser({ name: 'Zed Zebra-Writer' });
    await Manuscript.create({
      author: (await User.findOne({ email: writer.email }))!._id, authorName: 'Zed', email: writer.email, phone: '123456', bookTitle: 'Zebra Tales',
      category: 'Fiction', language: 'English', description: 'x'.repeat(30), authorBio: 'y'.repeat(20), format: 'Paperback',
      manuscriptFileUrl: 'u', manuscriptFileKey: 'k', agreedToTerms: true,
    });

    const res = await client({ cookie: admin.cookie }).get('/api/users?role=author&search=zebra');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ email: writer.email, role: 'author', submissions: 1, status: 'active' });
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/i);
    expect(res.body.pagination).toMatchObject({ page: 1, total: 1 });

    const admins = await client({ cookie: admin.cookie }).get('/api/users?role=admin&limit=50');
    expect(admins.body.data.every((u: any) => u.role === 'admin')).toBe(true);
  });

  it('treats the search text literally (no regex injection) and validates the query', async () => {
    const admin = await adminSession();
    const http = client({ cookie: admin.cookie });
    expect((await http.get('/api/users?search=.*')).body.data).toHaveLength(0);
    expect((await http.get('/api/users?role=root')).status).toBe(400);
    expect((await http.get('/api/users?limit=500')).status).toBe(400);
  });

  it('opens one account, and 404s/400s bad ids', async () => {
    const admin = await adminSession();
    const writer = await createUser();
    const ok = await client({ cookie: admin.cookie }).get(`/api/users/${await idOf(writer.email)}`);
    expect(ok.body.data.email).toBe(writer.email);
    expect((await client({ cookie: admin.cookie }).get('/api/users/aaaaaaaaaaaaaaaaaaaaaaaa')).status).toBe(404);
    expect((await client({ cookie: admin.cookie }).get('/api/users/nope')).status).toBe(400);
  });

  it('suspending an author ends their sessions at once, blocks sign-in, and is audited; reactivating restores access', async () => {
    const admin = await adminSession();
    const author = await authorSession();
    const id = await idOf(author.email);

    const res = await client({ cookie: admin.cookie }).patch(`/api/users/${id}/status`).send({ status: 'suspended', reason: 'Spam submissions' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('suspended');

    expect((await client({ cookie: author.cookie }).get('/api/auth/me')).status).toBe(401);
    expect(await Session.countDocuments({ user: id, revokedAt: null })).toBe(0);
    const blocked = await client().post('/api/auth/login').send({ email: author.email, password: author.password });
    expect(blocked.status).toBe(403);
    expect(await AuditLog.findOne({ action: 'user.suspended', targetId: id })).toMatchObject({ actorEmail: admin.email });
    expect((await AuditLog.findOne({ action: 'user.suspended', targetId: id }))!.summary).toMatch(/Spam submissions/);

    expect((await client({ cookie: admin.cookie }).patch(`/api/users/${id}/status`).send({ status: 'active' })).status).toBe(200);
    expect((await client().post('/api/auth/login').send({ email: author.email, password: author.password })).status).toBe(200);
    expect(await AuditLog.findOne({ action: 'user.reactivated', targetId: id })).not.toBeNull();
  });

  it('an administrator cannot touch themselves or other administrators; only a super admin can touch admins, never themselves', async () => {
    const admin = await adminSession({ role: 'admin' });
    const otherAdmin = await createUser({ role: 'admin' });
    const root = await adminSession({ role: 'superadmin' });
    const suspend = (cookie: string, id: string) => client({ cookie }).patch(`/api/users/${id}/status`).send({ status: 'suspended' });

    expect((await suspend(admin.cookie, await idOf(admin.email))).status).toBe(403); // self
    expect((await suspend(admin.cookie, await idOf(otherAdmin.email))).status).toBe(403); // peer
    expect((await suspend(root.cookie, await idOf(root.email))).status).toBe(403); // self, even for super admin
    expect((await suspend(root.cookie, await idOf(otherAdmin.email))).status).toBe(200);
    expect((await User.findOne({ email: otherAdmin.email }))!.status).toBe('suspended');
  });

  it('can force a sign-out of every session of an account', async () => {
    const admin = await adminSession();
    const { email, password } = await createUser();
    const a = await signIn(email, password);
    const b = await signIn(email, password);
    const res = await client({ cookie: admin.cookie }).post(`/api/users/${await idOf(email)}/revoke-sessions`).send({});
    expect(res.body.revoked).toBe(2);
    expect((await client({ cookie: a }).get('/api/auth/me')).status).toBe(401);
    expect((await client({ cookie: b }).get('/api/auth/me')).status).toBe(401);
    expect(await AuditLog.findOne({ action: 'user.sessions_revoked' })).not.toBeNull();
  });

  it('is closed to authors and guests', async () => {
    const author = await authorSession();
    const victim = await idOf((await createUser()).email);
    for (const [method, url] of [['get', '/api/users'], ['get', `/api/users/${victim}`], ['patch', `/api/users/${victim}/status`], ['post', `/api/users/${victim}/revoke-sessions`]] as const) {
      expect(((await (client({ cookie: author.cookie }) as any)[method](url).send({ status: 'suspended' })).status)).toBe(403);
      expect(((await (client() as any)[method](url).send({ status: 'suspended' })).status)).toBe(401);
    }
    expect((await User.findById(victim))!.status).toBe('active');
  });
});

describe('activity log', () => {
  it('lists administrative actions newest first, with filters and pagination, for administrators only', async () => {
    const admin = await adminSession();
    const http = client({ cookie: admin.cookie });
    const t = await http.post('/api/testimonials').send({ name: 'Log Subject', message: 'Great press.', status: 'published' });
    expect(t.status).toBe(201);
    await http.patch(`/api/testimonials/${t.body.data._id}`).send({ status: 'unpublished' });
    await http.delete(`/api/testimonials/${t.body.data._id}`);

    const all = await http.get('/api/audit-logs?limit=50');
    expect(all.status).toBe(200);
    const actions = all.body.data.map((e: any) => e.action);
    expect(actions.indexOf('testimonial.deleted')).toBeLessThan(actions.indexOf('testimonial.created')); // newest first
    expect(all.body.data.find((e: any) => e.action === 'testimonial.created')).toMatchObject({ actorEmail: admin.email, actorRole: 'admin' });

    const filtered = await http.get('/api/audit-logs?action=testimonial.updated');
    expect(filtered.body.data.length).toBeGreaterThan(0);
    expect(filtered.body.data.every((e: any) => e.action === 'testimonial.updated')).toBe(true);

    const searched = await http.get(`/api/audit-logs?search=${encodeURIComponent('Log Subject')}`);
    expect(searched.body.data.length).toBeGreaterThanOrEqual(3);

    expect((await http.get('/api/audit-logs?action=made.up')).status).toBe(400);
    expect((await http.get('/api/audit-logs?limit=1')).body.pagination.pages).toBeGreaterThan(1);

    const author = await authorSession();
    expect((await client({ cookie: author.cookie }).get('/api/audit-logs')).status).toBe(403);
    expect((await client().get('/api/audit-logs')).status).toBe(401);
  });

  it('records book and message deletions too', async () => {
    const admin = await adminSession();
    const http = client({ cookie: admin.cookie });
    const sent = await client().post('/api/contact').send({ name: 'Visitor', email: 'v@example.com', subject: 'Hello there', message: 'A question about publishing.' });
    expect(sent.status).toBe(201);
    const inbox = await http.get('/api/contact');
    const message = inbox.body.data.find((m: any) => m.subject === 'Hello there');
    expect((await http.delete(`/api/contact/${message._id}`)).status).toBe(200);
    const entry = await AuditLog.findOne({ action: 'message.deleted' });
    expect(entry!.summary).toMatch(/Hello there/);
  });

  it('cannot be edited or deleted through the API', async () => {
    const admin = await adminSession();
    const http = client({ cookie: admin.cookie });
    expect((await http.delete('/api/audit-logs/aaaaaaaaaaaaaaaaaaaaaaaa')).status).toBe(404);
    expect((await http.patch('/api/audit-logs/aaaaaaaaaaaaaaaaaaaaaaaa').send({})).status).toBe(404);
    expect((await http.post('/api/audit-logs').send({})).status).toBe(404);
  });
});

describe('notifications', () => {
  const give = (user: any, title: string, read = false) =>
    Notification.create({ user: user._id, type: 'manuscript_status', title, message: `${title} message`, link: '/author/dashboard', readAt: read ? new Date() : null });

  it('shows only the caller’s own, newest first, with an unread count', async () => {
    const me = await authorSession();
    const other = await authorSession();
    const mine = await User.findOne({ email: me.email });
    await give(mine, 'First');
    await give(mine, 'Second', true);
    await give(await User.findOne({ email: other.email }), 'Not mine');

    const res = await client({ cookie: me.cookie }).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.data.map((n: any) => n.title)).toEqual(['Second', 'First']);
    expect(res.body.unreadCount).toBe(1);
    expect(res.body.data[0]).toMatchObject({ read: true, link: '/author/dashboard' });
    expect((await client({ cookie: me.cookie }).get('/api/notifications?unread=true')).body.data).toHaveLength(1);
    expect((await client({ cookie: me.cookie }).get('/api/auth/me')).body.data.unreadNotifications).toBe(1);
  });

  it('marks one or all as read — and only ever your own', async () => {
    const me = await authorSession();
    const other = await authorSession();
    const mine = await User.findOne({ email: me.email });
    const theirs = await give(await User.findOne({ email: other.email }), 'Private to them');
    const a = await give(mine, 'A');
    await give(mine, 'B');

    expect((await client({ cookie: me.cookie }).patch(`/api/notifications/${a.id}/read`).send({})).status).toBe(200);
    expect((await client({ cookie: me.cookie }).get('/api/notifications')).body.unreadCount).toBe(1);

    // Someone else's notification: indistinguishable from one that doesn't exist, and untouched.
    expect((await client({ cookie: me.cookie }).patch(`/api/notifications/${theirs.id}/read`).send({})).status).toBe(404);
    expect((await Notification.findById(theirs.id))!.readAt).toBeNull();

    expect((await client({ cookie: me.cookie }).post('/api/notifications/read-all').send({})).status).toBe(200);
    expect((await client({ cookie: me.cookie }).get('/api/notifications')).body.unreadCount).toBe(0);
    expect((await Notification.findById(theirs.id))!.readAt).toBeNull(); // read-all didn't leak across accounts
  });

  it('needs a session and sane paging', async () => {
    expect((await client().get('/api/notifications')).status).toBe(401);
    const me = await authorSession();
    expect((await client({ cookie: me.cookie }).get('/api/notifications?limit=500')).status).toBe(400);
    expect((await client({ cookie: me.cookie }).patch('/api/notifications/not-an-id/read').send({})).status).toBe(400);
  });
});

describe('dashboard statistics', () => {
  it('counts registered authors and the new workflow status', async () => {
    const admin = await adminSession();
    await createUser();
    const res = await client({ cookie: admin.cookie }).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.registeredAuthors).toBeGreaterThanOrEqual(1);
    expect(res.body.data.manuscripts).toBeDefined();
  });
});
