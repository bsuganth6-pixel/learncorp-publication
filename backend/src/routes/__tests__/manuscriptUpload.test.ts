/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../../app';
import { installFakeDb, seed } from '../../testing/fakeDb';
import * as storage from '../../services/storageService';

// Real multer config + real signature checks + real Zod validation + real
// controller. Only S3 and the database are replaced. formLimiter allows 8
// submissions per window per test file — this file makes 7.
jest.mock('../../services/storageService', () => ({
  uploadPrivateFile: jest.fn(async (_b: Buffer, name: string) => ({ key: `fake/${name}`, url: `https://storage.invalid/${name}` })),
  getSignedFileUrl: jest.fn(),
  deletePrivateFile: jest.fn(),
}));

let fake: ReturnType<typeof installFakeDb>;
beforeAll(() => { fake = installFakeDb(seed()); });
afterAll(() => fake.restore());
beforeEach(() => (storage.uploadPrivateFile as jest.Mock).mockClear());

const pdf = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2048, 0x20)]);
const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(512)]);

// Mirrors what the frontend form actually sends: everything is a string, blank optionals are "".
const form = (overrides: Record<string, string> = {}) => {
  const fields: Record<string, string> = {
    authorName: 'Jane Doe', email: 'jane@example.com', phone: '9876543210', bookTitle: 'My First Novel',
    category: 'Fiction', language: 'English', pageCount: '', description: 'A description that is comfortably long enough.',
    authorBio: 'A short biography of the author.', format: 'Paperback', previousExperience: '', additionalInfo: '',
    agreedToTerms: 'true', ...overrides,
  };
  const r = request(app).post('/api/manuscripts');
  Object.entries(fields).forEach(([k, v]) => r.field(k, v));
  return r;
};

describe('POST /api/manuscripts', () => {
  it('accepts a genuine PDF with blank optional fields and stores it (the pageCount="" / agreedToTerms="true" case)', async () => {
    const before = fake.data.manuscripts.length;
    const res = await form().attach('manuscript', pdf(), { filename: 'book.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Submitted');
    expect(fake.data.manuscripts).toHaveLength(before + 1);
    const saved = fake.data.manuscripts[fake.data.manuscripts.length - 1];
    expect(saved.agreedToTerms).toBe(true);
    expect(saved.pageCount).toBeUndefined();
    expect(saved.manuscriptFileKey).toMatch(/^fake\//);
    expect(storage.uploadPrivateFile).toHaveBeenCalledTimes(1);
  });

  it('rejects a text file renamed to .pdf (declared mimetype lies, real signature does not match)', async () => {
    const res = await form().attach('manuscript', Buffer.from('just plain text, not a pdf'), { filename: 'fake.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/genuine PDF or Word/i);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('rejects a Windows executable disguised as a PDF', async () => {
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(300, 0x90)]);
    const res = await form().attach('manuscript', exe, { filename: 'invoice.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('rejects a disallowed content type with an explicit message (never a silent drop)', async () => {
    const res = await form().attach('manuscript', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/PDF or Word/i);
  });

  it('rejects a submission with no file at all', async () => {
    expect((await form()).status).toBe(400);
  });

  it('rejects agreedToTerms="false" instead of coercing it to true', async () => {
    const res = await form({ agreedToTerms: 'false' }).attach('manuscript', pdf(), { filename: 'book.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.details.agreedToTerms).toBeDefined();
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('refuses a file over the 25 MB limit and stores nothing', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(26 * 1024 * 1024, 0x20)]);
    const before = fake.data.manuscripts.length;
    let status: number | string | undefined;
    try {
      status = (await form().attach('manuscript', big, { filename: 'huge.pdf', contentType: 'application/pdf' })).status;
    } catch (err: any) {
      status = err.code; // the server may cut the connection once the limit trips
    }
    expect([400, 'ECONNRESET', 'EPIPE']).toContain(status);
    expect(fake.data.manuscripts).toHaveLength(before);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  }, 30000);
});

describe('image upload endpoint (admin)', () => {
  it('is admin-only', async () => {
    const res = await request(app).post('/api/manuscripts/uploads/image').attach('image', png(), { filename: 'c.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });
});
