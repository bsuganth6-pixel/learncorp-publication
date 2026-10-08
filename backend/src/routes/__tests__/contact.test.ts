import request from 'supertest';
import app from '../../app';
import { installFakeDb, seed, adminCookie } from '../../testing/fakeDb';

let fake: ReturnType<typeof installFakeDb>;
beforeAll(() => { fake = installFakeDb(seed()); });
afterAll(() => fake.restore());

const valid = { name: 'Visitor', email: 'visitor@example.com', subject: 'Question', message: 'A reasonably long question about services.' };

describe('POST /api/contact (4 of the 8 allowed submissions in this file)', () => {
  it('stores a valid message as unread', async () => {
    const before = fake.data.messages.length;
    const res = await request(app).post('/api/contact').send(valid);
    expect(res.status).toBe(201);
    expect(fake.data.messages).toHaveLength(before + 1);
    expect(fake.data.messages[before].read).toBe(false);
  });

  it.each([
    ['invalid email', { ...valid, email: 'nope' }],
    ['message too short', { ...valid, message: 'hi' }],
    ['missing subject', { name: valid.name, email: valid.email, message: valid.message }],
  ])('rejects %s with 400 and stores nothing', async (_l, body) => {
    const before = fake.data.messages.length;
    const res = await request(app).post('/api/contact').send(body);
    expect(res.status).toBe(400);
    expect(fake.data.messages).toHaveLength(before);
  });
});

describe('admin inbox', () => {
  it('lists messages and marks one read', async () => {
    const list = await request(app).get('/api/contact?unread=true').set('Cookie', adminCookie());
    expect(list.status).toBe(200);
    expect(list.body.data.every((m: { read: boolean }) => m.read === false)).toBe(true);
    const id = list.body.data[0]._id;
    const read = await request(app).patch(`/api/contact/${id}/read`).set('Cookie', adminCookie());
    expect(read.body.data.read).toBe(true);
  });
});
