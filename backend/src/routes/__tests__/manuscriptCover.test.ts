import request from 'supertest';
import app from '../../app';
import { installFakeDb, seed } from '../../testing/fakeDb';
import * as storage from '../../services/storageService';

// The optional cover image on the submission form. Regression test: it used to be
// silently discarded because the upload filter only allowed document types.
// 3 submissions here (formLimiter allows 8 per file).
jest.mock('../../services/storageService', () => ({
  uploadPrivateFile: jest.fn(async (_b: Buffer, name: string) => ({ key: `fake/${name}`, url: `https://storage.invalid/${name}` })),
  getSignedFileUrl: jest.fn(),
  deletePrivateFile: jest.fn(),
}));

let fake: ReturnType<typeof installFakeDb>;
beforeAll(() => { fake = installFakeDb(seed()); });
afterAll(() => fake.restore());
beforeEach(() => (storage.uploadPrivateFile as jest.Mock).mockClear());

const pdf = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1024, 0x20)]);
const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(256)]);

const form = () => {
  const r = request(app).post('/api/manuscripts');
  Object.entries({
    authorName: 'Jane Doe', email: 'jane@example.com', phone: '9876543210', bookTitle: 'Covered Book', category: 'Fiction',
    language: 'English', pageCount: '', description: 'A description that is comfortably long enough.',
    authorBio: 'A short biography of the author.', format: 'Paperback', previousExperience: '', additionalInfo: '', agreedToTerms: 'true',
  }).forEach(([k, v]) => r.field(k, v));
  return r;
};

describe('manuscript cover upload', () => {
  it('stores BOTH the manuscript and a genuine PNG cover', async () => {
    const res = await form()
      .attach('manuscript', pdf(), { filename: 'book.pdf', contentType: 'application/pdf' })
      .attach('cover', png(), { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(storage.uploadPrivateFile).toHaveBeenCalledTimes(2);
    const saved = fake.data.manuscripts[fake.data.manuscripts.length - 1];
    expect(saved.coverFileKey).toMatch(/^fake\//);
  });

  it('rejects a cover whose bytes are not an image, even though it claims image/png', async () => {
    const res = await form()
      .attach('manuscript', pdf(), { filename: 'book.pdf', contentType: 'application/pdf' })
      .attach('cover', Buffer.from('definitely not a png'), { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PNG or JPEG/i);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('rejects a cover of an unsupported type with an explicit message', async () => {
    const res = await form()
      .attach('manuscript', pdf(), { filename: 'book.pdf', contentType: 'application/pdf' })
      .attach('cover', Buffer.from('GIF89a....'), { filename: 'cover.gif', contentType: 'image/gif' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PNG or JPEG/i);
  });
});
