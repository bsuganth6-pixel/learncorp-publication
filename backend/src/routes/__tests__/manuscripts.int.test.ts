/* eslint-disable @typescript-eslint/no-explicit-any */
import { Manuscript } from '../../models/Manuscript';
import { Book } from '../../models/Book';
import { Author } from '../../models/Author';
import { Notification } from '../../models/Notification';
import { AuditLog } from '../../models/AuditLog';
import { User } from '../../models/User';
import * as storage from '../../services/storageService';
import * as cloudinary from '../../services/cloudinaryService';
import {
  startTestDatabase, stopTestDatabase, client, authorSession, adminSession, emailsTo, clearTestOutbox, drainBackground,
} from '../../testing/integration';

// Everything real except the two outbound storage services.
jest.mock('../../services/storageService', () => ({
  uploadPrivateFile: jest.fn(async (_b: Buffer, name: string, _m: string, folder: string) => ({
    key: `${folder}/mock-${name}`, url: `https://storage.invalid/${folder}/mock-${name}`,
  })),
  getSignedFileUrl: jest.fn(async (key: string) => `https://signed.invalid/${key}?sig=1`),
  readPrivateFile: jest.fn(async () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(512)])),
}));
jest.mock('../../services/cloudinaryService', () => ({
  uploadImageBuffer: jest.fn(async () => 'https://cdn.invalid/covers/cover.png'),
}));

beforeAll(startTestDatabase);
afterAll(stopTestDatabase);
beforeEach(() => {
  clearTestOutbox();
  jest.clearAllMocks();
});

const pdf = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2048, 0x20)]);
const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(512)]);

// What the frontend form actually sends: every value a string, blank optionals as "".
const formFields = (overrides: Record<string, string> = {}): Record<string, string> => ({
  phone: '9876543210', bookTitle: 'The River Between', category: 'Fiction', language: 'English', pageCount: '',
  description: 'A description that is comfortably long enough.', authorBio: 'A short biography of the author.',
  format: 'Paperback', previousExperience: '', additionalInfo: '', agreedToTerms: 'true', ...overrides,
});

function submitRequest(cookie: string, overrides: Record<string, string> = {}) {
  const req = client({ cookie }).post('/api/manuscripts');
  Object.entries(formFields(overrides)).forEach(([k, v]) => req.field(k, v));
  return req;
}
const submit = (cookie: string, overrides: Record<string, string> = {}, cover = false) => {
  const req = submitRequest(cookie, overrides).attach('manuscript', pdf(), { filename: 'book.pdf', contentType: 'application/pdf' });
  return cover ? req.attach('cover', png(), { filename: 'cover.png', contentType: 'image/png' }) : req;
};

/** An author with a submission already in the system. */
async function authorWithSubmission(overrides: Record<string, string> = {}, cover = false) {
  const author = await authorSession();
  const res = await submit(author.cookie, overrides, cover);
  expect(res.status).toBe(201);
  return { ...author, id: res.body.data.id as string };
}

const decide = (adminCookie: string, id: string, status: string, note?: string) =>
  client({ cookie: adminCookie }).patch(`/api/manuscripts/${id}/status`).send({ status, ...(note ? { note } : {}) });

describe('submitting a manuscript', () => {
  it('stores it under the signed-in author, taking identity from the account and never from the form', async () => {
    const author = await authorSession({ name: 'Real Name' });
    const res = await submit(author.cookie, { authorName: 'Impostor', email: 'impostor@example.com', status: 'Accepted', author: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Submitted');

    const saved = await Manuscript.findById(res.body.data.id);
    expect(saved).toMatchObject({ authorName: 'Real Name', email: author.email, status: 'Submitted', version: 1, agreedToTerms: true });
    expect(String(saved!.author)).toBe(String((await User.findOne({ email: author.email }))!._id));
    expect(saved!.pageCount).toBeUndefined();
    expect(saved!.history).toHaveLength(1);
    expect(saved!.manuscriptFileKey).toMatch(/^manuscripts\/mock-/);
    expect(storage.uploadPrivateFile).toHaveBeenCalledTimes(1);
  });

  it('tells the author it arrived (in-app)', async () => {
    const author = await authorSession();
    await submit(author.cookie);
    const note = await Notification.findOne({ user: (await User.findOne({ email: author.email }))!._id });
    expect(note!.type).toBe('manuscript_received');
    expect(note!.readAt).toBeNull();
    expect(note!.link).toMatch(/^\/author\/submissions\//);
  });

  it('keeps an optional cover and rejects a bad one without storing anything', async () => {
    const author = await authorSession();
    const ok = await submit(author.cookie, {}, true);
    expect(ok.status).toBe(201);
    expect((await Manuscript.findById(ok.body.data.id))!.coverFileKey).toMatch(/^manuscript-covers\//);

    jest.clearAllMocks();
    const bad = await submitRequest(author.cookie)
      .attach('manuscript', pdf(), { filename: 'book.pdf', contentType: 'application/pdf' })
      .attach('cover', Buffer.from('not an image at all'), { filename: 'cover.png', contentType: 'image/png' });
    expect(bad.status).toBe(400);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('refuses an author who has not confirmed their email, before reading the upload', async () => {
    const author = await authorSession({ verified: false });
    const res = await submit(author.cookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('refuses guests and administrators', async () => {
    expect((await submit('')).status).toBe(401);
    const admin = await adminSession();
    expect((await submit(admin.cookie)).status).toBe(403);
  });

  it('rejects files that are not what they claim to be', async () => {
    const author = await authorSession();
    const send = (file: Buffer, filename: string, contentType: string) =>
      submitRequest(author.cookie).attach('manuscript', file, { filename, contentType });

    const renamedText = await send(Buffer.from('just plain text, not a pdf'), 'fake.pdf', 'application/pdf');
    expect(renamedText.status).toBe(400);
    expect(renamedText.body.message).toMatch(/genuine PDF or Word/i);

    const exe = await send(Buffer.concat([Buffer.from('MZ'), Buffer.alloc(300, 0x90)]), 'invoice.pdf', 'application/pdf');
    expect(exe.status).toBe(400);

    const wrongType = await send(Buffer.from('hello'), 'notes.txt', 'text/plain');
    expect(wrongType.status).toBe(400);
    expect(wrongType.body.message).toMatch(/PDF or Word/i);

    expect((await submitRequest(author.cookie)).status).toBe(400); // no file at all
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
    expect(await Manuscript.countDocuments({ author: (await User.findOne({ email: author.email }))!._id })).toBe(0);
  });

  it('rejects files over 25 MB with a clear message', async () => {
    const author = await authorSession();
    const huge = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(26 * 1024 * 1024, 0x20)]);
    const res = await submitRequest(author.cookie).attach('manuscript', huge, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too large/i);
  });

  it('does not coerce agreedToTerms="false" into true, and names the field', async () => {
    const author = await authorSession();
    const res = await submit(author.cookie, { agreedToTerms: 'false' });
    expect(res.status).toBe(400);
    expect(res.body.details.agreedToTerms).toBeDefined();
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('validates the details', async () => {
    const author = await authorSession();
    const res = await submit(author.cookie, { description: 'too short', bookTitle: '', phone: '1' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(['description', 'bookTitle', 'phone']));
  });
});

describe('an author can only ever see their own submissions', () => {
  it('lists and opens their own; the response carries no storage keys, file URLs or staff identities', async () => {
    const mine = await authorWithSubmission({}, true);
    const list = await client({ cookie: mine.cookie }).get('/api/manuscripts/mine');
    expect(list.status).toBe(200);
    expect(list.body.data.map((m: any) => m.id)).toContain(mine.id);

    const detail = await client({ cookie: mine.cookie }).get(`/api/manuscripts/mine/${mine.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: mine.id, status: 'Submitted', canResubmit: false, hasCover: true, version: 1 });
    const text = JSON.stringify(detail.body);
    expect(text).not.toMatch(/manuscripts\/mock-|manuscript-covers\/mock-|storage\.invalid|FileKey|FileUrl|previousVersions/);
    expect(detail.body.data.history[0].by).toBe('You');
  });

  it("another author gets 404 for someone else's submission on every route — not 403, so ids can't be probed", async () => {
    const owner = await authorWithSubmission();
    const intruder = await authorSession();
    const http = client({ cookie: intruder.cookie });

    expect((await http.get(`/api/manuscripts/mine/${owner.id}`)).status).toBe(404);
    expect((await http.get(`/api/manuscripts/mine/${owner.id}/file-url`)).status).toBe(404);
    expect((await http.put(`/api/manuscripts/mine/${owner.id}`).send({ note: 'I am not the owner of this one' })).status).toBe(404);

    const theirs = await http.get('/api/manuscripts/mine');
    expect(theirs.body.data).toHaveLength(0);
    expect(theirs.body.pagination.total).toBe(0);
  });

  it('a manuscript that predates accounts (no owner) belongs to nobody', async () => {
    const author = await authorSession();
    const { insertedId } = await Manuscript.collection.insertOne({
      authorName: 'Old Submitter', email: author.email, phone: '123456', bookTitle: 'Legacy', category: 'Fiction', language: 'English',
      description: 'x'.repeat(30), authorBio: 'y'.repeat(20), format: 'Paperback', manuscriptFileUrl: 'u', manuscriptFileKey: 'k',
      agreedToTerms: true, status: 'Submitted', createdAt: new Date(), updatedAt: new Date(),
    });
    expect((await client({ cookie: author.cookie }).get(`/api/manuscripts/mine/${insertedId}`)).status).toBe(404);
    const list = await client({ cookie: author.cookie }).get('/api/manuscripts/mine');
    expect(list.body.data.find((m: any) => m.bookTitle === 'Legacy')).toBeUndefined();
  });

  it('issues a short-lived signed link only for the owner and only for files that exist', async () => {
    const withCover = await authorWithSubmission({}, true);
    const manuscriptLink = await client({ cookie: withCover.cookie }).get(`/api/manuscripts/mine/${withCover.id}/file-url`);
    expect(manuscriptLink.body.url).toMatch(/^https:\/\/signed\.invalid\/manuscripts\//);
    expect(manuscriptLink.body.expiresInSeconds).toBe(300);
    const coverLink = await client({ cookie: withCover.cookie }).get(`/api/manuscripts/mine/${withCover.id}/file-url?file=cover`);
    expect(coverLink.body.url).toMatch(/manuscript-covers\//);

    const noCover = await authorWithSubmission();
    expect((await client({ cookie: noCover.cookie }).get(`/api/manuscripts/mine/${noCover.id}/file-url?file=cover`)).status).toBe(404);
    expect((await client({ cookie: noCover.cookie }).get(`/api/manuscripts/mine/${noCover.id}/file-url?file=secret`)).status).toBe(400);
  });

  it('rejects malformed ids and keeps /mine from being read as an id', async () => {
    const author = await authorSession();
    expect((await client({ cookie: author.cookie }).get('/api/manuscripts/mine/not-an-id')).status).toBe(400);
    expect((await client({ cookie: author.cookie }).get('/api/manuscripts/mine')).status).toBe(200);
  });
});

describe('authors cannot take editorial actions', () => {
  it('cannot approve, reject, request changes on or publish their own manuscript, nor use the admin views', async () => {
    const mine = await authorWithSubmission();
    const http = client({ cookie: mine.cookie });

    for (const status of ['Under Review', 'Accepted', 'Rejected', 'Changes Requested']) {
      expect((await http.patch(`/api/manuscripts/${mine.id}/status`).send({ status, note: 'I decide this myself' })).status).toBe(403);
    }
    expect((await http.post(`/api/manuscripts/${mine.id}/publish`).send({ isbn: '9781234567897', price: 10 })).status).toBe(403);
    expect((await http.get(`/api/manuscripts/${mine.id}`)).status).toBe(403);
    expect((await http.get('/api/manuscripts')).status).toBe(403);
    expect((await http.get(`/api/manuscripts/${mine.id}/file-url`)).status).toBe(403);

    expect((await Manuscript.findById(mine.id))!.status).toBe('Submitted');
  });
});

describe('administrator review', () => {
  it('lists and opens submissions with the owner attached, without storage keys', async () => {
    const mine = await authorWithSubmission({ bookTitle: 'Admin Visible' }, true);
    const admin = await adminSession();

    const list = await client({ cookie: admin.cookie }).get('/api/manuscripts?status=Submitted&limit=50');
    expect(list.status).toBe(200);
    expect(list.body.data.map((m: any) => m._id)).toContain(mine.id);

    const detail = await client({ cookie: admin.cookie }).get(`/api/manuscripts/${mine.id}`);
    expect(detail.body.data.author).toMatchObject({ email: mine.email, emailVerified: true });
    expect(JSON.stringify(detail.body)).not.toMatch(/manuscriptFileKey|coverFileKey|previousVersions/);

    expect((await client({ cookie: admin.cookie }).get('/api/manuscripts?status=Bogus')).status).toBe(400);
  });

  it('moves a manuscript along, records who did what, and tells the author in-app and by email', async () => {
    const mine = await authorWithSubmission({ bookTitle: 'Review Me' });
    const admin = await adminSession();
    clearTestOutbox();

    const res = await decide(admin.cookie, mine.id, 'Under Review');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Under Review');
    expect(JSON.stringify(res.body)).not.toMatch(/FileKey|previousVersions/);

    const saved = await Manuscript.findById(mine.id);
    expect(saved!.history.map((h) => [h.status, h.actor])).toEqual([['Submitted', 'author'], ['Under Review', 'admin']]);
    expect(String(saved!.history[1].by)).toBe(String((await User.findOne({ email: admin.email }))!._id));

    const note = await Notification.findOne({ user: saved!.author, type: 'manuscript_status' });
    expect(note!.title).toMatch(/under review/i);
    expect(note!.link).toBe(`/author/submissions/${mine.id}`);
    const mails = await emailsTo(mine.email);
    expect(mails.some((m) => /Review Me/.test(m.subject) && /under review/i.test(m.subject))).toBe(true);

    expect(await AuditLog.findOne({ action: 'manuscript.status_changed', targetId: mine.id })).toMatchObject({ actorEmail: admin.email });
  });

  it('requires an explanation to reject or to request changes, and the author can read it', async () => {
    const mine = await authorWithSubmission();
    const admin = await adminSession();

    const noNote = await decide(admin.cookie, mine.id, 'Changes Requested');
    expect(noNote.status).toBe(400);
    expect(noNote.body.details.note).toBeDefined();
    expect((await decide(admin.cookie, mine.id, 'Rejected', 'short')).status).toBe(400);

    const ok = await decide(admin.cookie, mine.id, 'Changes Requested', 'Please tighten chapters 3 and 4 and add a synopsis.');
    expect(ok.status).toBe(200);

    const view = await client({ cookie: mine.cookie }).get(`/api/manuscripts/mine/${mine.id}`);
    expect(view.body.data).toMatchObject({ status: 'Changes Requested', canResubmit: true });
    expect(view.body.data.latestFeedback.note).toMatch(/tighten chapters/);
    expect(view.body.data.history.at(-1).by).toBe('Editorial team'); // never the individual reviewer
    const mails = await emailsTo(mine.email);
    expect(mails.some((m) => m.text.includes('Please tighten chapters 3 and 4'))).toBe(true);
  });

  it('only allows the transitions the workflow defines', async () => {
    const admin = await adminSession();
    const accepted = await authorWithSubmission();
    expect((await decide(admin.cookie, accepted.id, 'Accepted')).status).toBe(200);
    expect((await decide(admin.cookie, accepted.id, 'Under Review')).status).toBe(409); // can't go backwards
    expect((await decide(admin.cookie, accepted.id, 'Rejected', 'Changed our mind about it.')).status).toBe(409);
    expect((await decide(admin.cookie, accepted.id, 'Accepted')).status).toBe(409);

    const rejected = await authorWithSubmission();
    expect((await decide(admin.cookie, rejected.id, 'Rejected', 'Not a fit for our list right now.')).status).toBe(200);
    expect((await decide(admin.cookie, rejected.id, 'Accepted')).status).toBe(409); // terminal

    // "Published" is not a decision: it only happens through the publish action.
    const fresh = await authorWithSubmission();
    expect((await decide(admin.cookie, fresh.id, 'Published')).status).toBe(400);
    expect((await Manuscript.findById(fresh.id))!.status).toBe('Submitted');
  });

  it('if another administrator decides between the read and the write, the second decision is refused instead of overwriting', async () => {
    const mine = await authorWithSubmission();
    const a = await adminSession();

    // Interleave deterministically: right before A's write lands, B's decision is committed.
    // (Independent of the database's own locking, so it proves the guard in our code.)
    const realUpdate = Manuscript.findOneAndUpdate.bind(Manuscript);
    const spy = jest.spyOn(Manuscript, 'findOneAndUpdate').mockImplementationOnce(((...args: any[]) =>
      Manuscript.updateOne({ _id: mine.id }, { $set: { status: 'Rejected' } }).then(() => (realUpdate as any)(...args))) as any);

    const res = await decide(a.cookie, mine.id, 'Accepted');
    spy.mockRestore();

    expect(res.status).toBe(409);
    expect(await Manuscript.findById(mine.id)).toMatchObject({ status: 'Rejected' });
    expect((await Manuscript.findById(mine.id))!.history).toHaveLength(1); // A's decision left no trace
  });

  it('404s an unknown manuscript and 400s a malformed id', async () => {
    const admin = await adminSession();
    expect((await decide(admin.cookie, 'aaaaaaaaaaaaaaaaaaaaaaaa', 'Accepted')).status).toBe(404);
    expect((await decide(admin.cookie, 'nope', 'Accepted')).status).toBe(400);
  });

  it('opening a private file is audited', async () => {
    const mine = await authorWithSubmission();
    const admin = await adminSession();
    const res = await client({ cookie: admin.cookie }).get(`/api/manuscripts/${mine.id}/file-url`);
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/signed\.invalid/);
    expect(await AuditLog.findOne({ action: 'manuscript.file_accessed', targetId: mine.id })).not.toBeNull();
  });
});

describe('updating and resubmitting when changes were requested', () => {
  async function awaitingChanges() {
    const mine = await authorWithSubmission({ bookTitle: 'First Draft Title', language: 'Hindi' });
    const admin = await adminSession();
    await decide(admin.cookie, mine.id, 'Changes Requested', 'Please revise the opening chapters.');
    return { ...mine, admin };
  }
  const resubmit = (cookie: string, id: string, fields: Record<string, string>) => {
    const req = client({ cookie }).put(`/api/manuscripts/mine/${id}`);
    Object.entries(fields).forEach(([k, v]) => req.field(k, v));
    return req;
  };

  it('is refused unless the editors asked for changes', async () => {
    const mine = await authorWithSubmission();
    const res = await resubmit(mine.cookie, mine.id, { note: 'I would like to change a few things.' });
    expect(res.status).toBe(409);
  });

  it('sends the manuscript back for review with a new file, keeping the old one and only the fields that changed', async () => {
    const ctx = await awaitingChanges();
    const before = await Manuscript.findById(ctx.id);

    const res = await resubmit(ctx.cookie, ctx.id, { note: 'Rewrote chapters 1-3 as requested.', bookTitle: 'Revised Title' })
      .attach('manuscript', pdf(), { filename: 'book-v2.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'Submitted', version: 2, bookTitle: 'Revised Title', canResubmit: false });

    const after = await Manuscript.findById(ctx.id);
    expect(after).toMatchObject({ status: 'Submitted', version: 2, bookTitle: 'Revised Title', language: 'Hindi' }); // untouched field survives
    expect(after!.manuscriptFileKey).toMatch(/book-v2\.pdf$/);
    expect(after!.previousVersions).toHaveLength(1);
    expect(after!.previousVersions[0]).toMatchObject({ version: 1, manuscriptFileKey: before!.manuscriptFileKey });
    expect(after!.history.at(-1)).toMatchObject({ status: 'Submitted', actor: 'author', note: 'Rewrote chapters 1-3 as requested.' });
  });

  it('allows a details-only update (no new file) without creating a file version', async () => {
    const ctx = await awaitingChanges();
    const res = await resubmit(ctx.cookie, ctx.id, { note: 'Only the synopsis needed fixing.', description: 'A better synopsis that is long enough.' });
    expect(res.status).toBe(200);
    const after = await Manuscript.findById(ctx.id);
    expect(after!.previousVersions).toHaveLength(0);
    expect(after!.description).toBe('A better synopsis that is long enough.');
  });

  it('requires a note telling the editors what changed', async () => {
    const ctx = await awaitingChanges();
    expect((await resubmit(ctx.cookie, ctx.id, {})).status).toBe(400);
    expect((await resubmit(ctx.cookie, ctx.id, { note: 'short' })).status).toBe(400);
    expect((await Manuscript.findById(ctx.id))!.status).toBe('Changes Requested');
  });

  it('only the owner can resubmit, and only once per request for changes', async () => {
    const ctx = await awaitingChanges();
    const intruder = await authorSession();
    expect((await resubmit(intruder.cookie, ctx.id, { note: 'Trying to edit somebody else’s book.' })).status).toBe(404);

    expect((await resubmit(ctx.cookie, ctx.id, { note: 'First resubmission, as asked.' })).status).toBe(200);
    expect((await resubmit(ctx.cookie, ctx.id, { note: 'Second attempt straight away.' })).status).toBe(409);
  });

  it('refuses a bad replacement file without changing the submission', async () => {
    const ctx = await awaitingChanges();
    const res = await resubmit(ctx.cookie, ctx.id, { note: 'Here is the revised manuscript.' })
      .attach('manuscript', Buffer.from('plain text pretending to be a pdf'), { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(await Manuscript.findById(ctx.id)).toMatchObject({ status: 'Changes Requested', version: 1 });
  });
});

describe('publishing an accepted manuscript', () => {
  let isbnSeq = 0;
  const nextIsbn = () => `978${String(2000000000 + ++isbnSeq)}`;
  const publishBody = () => ({ isbn: nextIsbn(), price: 349 });
  const publish = (cookie: string, id: string, body: Record<string, unknown> = publishBody()) =>
    client({ cookie }).post(`/api/manuscripts/${id}/publish`).send(body);

  async function acceptedManuscript(opts: { cover?: boolean; overrides?: Record<string, string> } = {}) {
    const mine = await authorWithSubmission(opts.overrides ?? {}, opts.cover ?? true);
    const admin = await adminSession();
    expect((await decide(admin.cookie, mine.id, 'Accepted')).status).toBe(200);
    return { ...mine, admin };
  }

  it('creates the catalogue book and the author profile, marks it Published, and tells the author', async () => {
    const ctx = await acceptedManuscript({ overrides: { bookTitle: 'Published Title', category: 'Poetry', pageCount: '210' } });
    clearTestOutbox();
    const body = publishBody();
    const res = await publish(ctx.admin.cookie, ctx.id, body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Published');

    const book = await Book.findOne({ slug: res.body.book.slug });
    expect(book).toMatchObject({
      title: 'Published Title', isbn: body.isbn, price: 349, category: 'Poetry', format: 'Paperback', pages: 210,
      status: 'published', coverImageUrl: 'https://cdn.invalid/covers/cover.png',
    });
    const profile = await Author.findById(book!.authors[0]);
    expect(profile).toMatchObject({ name: 'Test Person', bio: 'A short biography of the author.' });
    expect(String(profile!.user)).toBe(String((await Manuscript.findById(ctx.id))!.author));
    expect(String((await Manuscript.findById(ctx.id))!.book)).toBe(String(book!._id));

    // The cover came from the author's private upload, copied to the CDN — not exposed in place.
    expect(storage.readPrivateFile).toHaveBeenCalledTimes(1);
    expect(cloudinary.uploadImageBuffer).toHaveBeenCalledTimes(1);

    // It is now in the public catalogue.
    const catalogue = await client().get('/api/books?limit=50');
    expect(catalogue.body.data.map((b: any) => b.slug)).toContain(res.body.book.slug);

    const note = await Notification.findOne({ user: (await Manuscript.findById(ctx.id))!.author, type: 'book_published' });
    expect(note).not.toBeNull();
    expect((await emailsTo(ctx.email)).some((m) => /published/i.test(m.subject))).toBe(true);
    expect(await AuditLog.findOne({ action: 'manuscript.published', targetId: ctx.id })).not.toBeNull();

    const authorsView = await client({ cookie: ctx.cookie }).get(`/api/manuscripts/mine/${ctx.id}`);
    expect(authorsView.body.data).toMatchObject({ status: 'Published', bookSlug: res.body.book.slug });
  });

  it('only publishes accepted manuscripts', async () => {
    const mine = await authorWithSubmission();
    const admin = await adminSession();
    const body = publishBody();
    expect((await publish(admin.cookie, mine.id, body)).status).toBe(409);
    expect(await Book.countDocuments({ isbn: body.isbn })).toBe(0);
  });

  it('needs a cover from somewhere: the author’s own, or one supplied by the editor', async () => {
    const ctx = await acceptedManuscript({ cover: false });
    const body = publishBody();
    const missing = await publish(ctx.admin.cookie, ctx.id, body);
    expect(missing.status).toBe(400);
    expect(missing.body.message).toMatch(/cover image is required/i);
    expect((await Manuscript.findById(ctx.id))!.status).toBe('Accepted');

    const supplied = await publish(ctx.admin.cookie, ctx.id, { ...body, coverImageUrl: 'https://cdn.invalid/covers/chosen.png' });
    expect(supplied.status).toBe(200);
    expect((await Book.findOne({ slug: supplied.body.book.slug }))!.coverImageUrl).toBe('https://cdn.invalid/covers/chosen.png');
  });

  it('gives the same author a single public profile across several books', async () => {
    const author = await authorSession();
    const admin = await adminSession();
    const ids: string[] = [];
    for (const [i, title] of ['First Book', 'Second Book'].entries()) {
      const res = await submit(author.cookie, { bookTitle: title }, true);
      ids.push(res.body.data.id);
      await decide(admin.cookie, res.body.data.id, 'Accepted');
      expect((await publish(admin.cookie, res.body.data.id, { isbn: `97812345678${i}0`, price: 100 })).status).toBe(200);
    }
    const userId = (await User.findOne({ email: author.email }))!._id;
    expect(await Author.countDocuments({ user: userId })).toBe(1);
    const books = await Book.find({ title: { $in: ['First Book', 'Second Book'] } });
    expect(new Set(books.map((b) => String(b.authors[0]))).size).toBe(1);
  });

  it('refuses a duplicate ISBN and leaves the manuscript accepted', async () => {
    const first = await acceptedManuscript();
    expect((await publish(first.admin.cookie, first.id, { isbn: '9780000000019', price: 10 })).status).toBe(200);
    const second = await acceptedManuscript();
    const dup = await publish(second.admin.cookie, second.id, { isbn: '9780000000019', price: 10 });
    expect(dup.status).toBe(409);
    expect((await Manuscript.findById(second.id))!.status).toBe('Accepted');
  });

  it('picks up where a half-finished attempt stopped instead of creating a second book', async () => {
    const ctx = await acceptedManuscript();
    const book = await Book.create({
      title: 'Half Published', slug: 'half-published', authors: [(await Author.create({ name: 'Half', slug: 'half-author', bio: 'b' }))._id],
      description: 'd', isbn: '9780000000026', category: 'Fiction', language: 'English', format: 'Paperback', price: 5,
      coverImageUrl: 'https://cdn.invalid/x.png', status: 'published',
    });
    await Manuscript.updateOne({ _id: ctx.id }, { $set: { book: book._id } });

    const res = await publish(ctx.admin.cookie, ctx.id, { isbn: '9780000000026', price: 5 });
    expect(res.status).toBe(200);
    expect(res.body.book.slug).toBe('half-published');
    expect(await Book.countDocuments({ isbn: '9780000000026' })).toBe(1);
  });

  it('cannot be published twice, and validates the details', async () => {
    const ctx = await acceptedManuscript();
    expect((await publish(ctx.admin.cookie, ctx.id, { isbn: '123', price: 10 })).status).toBe(400);
    expect((await publish(ctx.admin.cookie, ctx.id, { isbn: '9780000000033', price: -5 })).status).toBe(400);
    expect((await publish(ctx.admin.cookie, ctx.id, { isbn: '9780000000033', price: 10 })).status).toBe(200);
    expect((await publish(ctx.admin.cookie, ctx.id, { isbn: '9780000000040', price: 10 })).status).toBe(409);
  });
});
