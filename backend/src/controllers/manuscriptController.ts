import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { Manuscript, IManuscript, ManuscriptStatus } from '../models/Manuscript';
import { Book } from '../models/Book';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { runInBackground } from '../utils/background';
import { isAllowedManuscriptFile, isAllowedImageFile } from '../utils/fileSignature';
import { toAuthorView } from '../utils/manuscriptSerializers';
import { uploadPrivateFile, getSignedFileUrl } from '../services/storageService';
import { uploadImageBuffer } from '../services/cloudinaryService';
import { canAdminTransition, canAuthorResubmit, statusCopy, AdminDecision } from '../services/manuscriptWorkflow';
import { publishManuscript as publishToCatalogue } from '../services/publishService';
import { notifyUser } from '../services/notificationService';
import { sendManuscriptStatusEmail } from '../services/accountMail';
import { audit } from '../services/auditService';
import type { SubmitManuscriptInput, ResubmitManuscriptInput, PublishManuscriptInput } from '../validators/manuscriptValidators';

type UploadedFiles = { [field: string]: Express.Multer.File[] };

// Storage keys are never sent to a browser; the admin views also drop the previous-version list.
const ADMIN_HIDDEN_FIELDS = '-manuscriptFileKey -coverFileKey -previousVersions';

const submissionPath = (id: string): string => `/author/submissions/${id}`;

/** Checks every file's real signature first, and only then stores anything. */
async function storeUploads(files: UploadedFiles | undefined, opts: { manuscriptRequired: boolean }) {
  const manuscriptFile = files?.manuscript?.[0];
  const coverFile = files?.cover?.[0];

  if (!manuscriptFile && opts.manuscriptRequired) {
    throw ApiError.badRequest('A manuscript file (PDF or Word document) is required');
  }
  if (manuscriptFile && !isAllowedManuscriptFile(manuscriptFile.buffer)) {
    throw ApiError.badRequest('Manuscript must be a genuine PDF or Word document');
  }
  if (coverFile && !isAllowedImageFile(coverFile.buffer)) {
    throw ApiError.badRequest('Cover file must be a genuine PNG or JPEG image');
  }

  const manuscript = manuscriptFile
    ? await uploadPrivateFile(manuscriptFile.buffer, manuscriptFile.originalname, manuscriptFile.mimetype, 'manuscripts')
    : undefined;
  const cover = coverFile
    ? await uploadPrivateFile(coverFile.buffer, coverFile.originalname, coverFile.mimetype, 'manuscript-covers')
    : undefined;
  return { manuscript, cover };
}

/** In-app notification plus an email, for the account that owns the manuscript. Submissions from before accounts existed have no owner and are skipped. */
async function notifyAuthor(manuscript: IManuscript, status: ManuscriptStatus, note?: string): Promise<void> {
  if (!manuscript.author) return;
  const copy = statusCopy(status, manuscript.bookTitle);
  const path = submissionPath(manuscript.id);

  await notifyUser(manuscript.author, {
    type: status === 'Published' ? 'book_published' : status === 'Submitted' ? 'manuscript_received' : 'manuscript_status',
    title: copy.headline,
    message: copy.message,
    link: path,
  });
  if (status !== 'Submitted') {
    runInBackground('manuscript status email', () =>
      sendManuscriptStatusEmail({ name: manuscript.authorName, email: manuscript.email }, { bookTitle: manuscript.bookTitle, ...copy, note, path })
    );
  }
}

const definedOnly = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

// ================================================================== author: own submissions only

export const submitManuscript = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const input = req.body as SubmitManuscriptInput;
  const uploads = await storeUploads(req.files as UploadedFiles | undefined, { manuscriptRequired: true });

  const manuscript = await Manuscript.create({
    ...input,
    // Identity and workflow state come from the server, after the spread, so the form can't set them.
    author: user._id,
    authorName: user.name,
    email: user.email,
    manuscriptFileUrl: uploads.manuscript!.url,
    manuscriptFileKey: uploads.manuscript!.key,
    coverFileUrl: uploads.cover?.url,
    coverFileKey: uploads.cover?.key,
    status: 'Submitted',
    version: 1,
    history: [{ status: 'Submitted', actor: 'author', by: user._id, at: new Date() }],
  });

  await notifyAuthor(manuscript, 'Submitted');
  res.status(201).json({
    success: true,
    message: 'Thanks — your manuscript has been received. You can follow its progress from your dashboard.',
    data: { id: manuscript.id, status: manuscript.status },
  });
});

export const getMyManuscripts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = req.query as unknown as { page: number; limit: number; status?: ManuscriptStatus };
  const filter: FilterQuery<IManuscript> = { author: req.user!._id, ...(status ? { status } : {}) };

  const [items, total] = await Promise.all([
    Manuscript.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Manuscript.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items.map((m) => toAuthorView(m)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * Ownership is part of the query, not a check after it: someone else's id simply finds nothing.
 * The answer is a 404 either way, so ids can't be probed to learn which submissions exist.
 */
async function findOwned(req: Request): Promise<IManuscript> {
  const manuscript = await Manuscript.findOne({ _id: req.params.id, author: req.user!._id });
  if (!manuscript) throw ApiError.notFound('Submission not found');
  return manuscript;
}

export const getMyManuscript = asyncHandler(async (req: Request, res: Response) => {
  const manuscript = await findOwned(req);
  const book = manuscript.book ? await Book.findById(manuscript.book) : null;
  res.json({ success: true, data: toAuthorView(manuscript, book?.slug) });
});

export const getMyManuscriptFileUrl = asyncHandler(async (req: Request, res: Response) => {
  const manuscript = await findOwned(req);
  const key = req.query.file === 'cover' ? manuscript.coverFileKey : manuscript.manuscriptFileKey;
  if (!key) throw ApiError.notFound('File not found for this submission');
  res.json({ success: true, url: await getSignedFileUrl(key, 300), expiresInSeconds: 300 });
});

export const resubmitManuscript = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { note, ...changes } = req.body as ResubmitManuscriptInput;

  const manuscript = await findOwned(req);
  if (!canAuthorResubmit(manuscript.status)) {
    throw ApiError.conflict('This submission can only be updated when the editors have asked for changes.');
  }

  const uploads = await storeUploads(req.files as UploadedFiles | undefined, { manuscriptRequired: false });
  const replacesFiles = Boolean(uploads.manuscript || uploads.cover);

  const set: Record<string, unknown> = { ...definedOnly(changes), status: 'Submitted', version: manuscript.version + 1 };
  if (uploads.manuscript) {
    set.manuscriptFileUrl = uploads.manuscript.url;
    set.manuscriptFileKey = uploads.manuscript.key;
  }
  if (uploads.cover) {
    set.coverFileUrl = uploads.cover.url;
    set.coverFileKey = uploads.cover.key;
  }

  const updated = await Manuscript.findOneAndUpdate(
    // Ownership and status are re-checked in the write itself, so a concurrent decision can't be overwritten.
    { _id: manuscript._id, author: user._id, status: 'Changes Requested' },
    {
      $set: set,
      $push: {
        history: { status: 'Submitted', note, actor: 'author', by: user._id, at: new Date() },
        // Replaced files are kept (keys only) so the editors can still compare versions.
        ...(replacesFiles
          ? {
              previousVersions: {
                version: manuscript.version,
                manuscriptFileKey: manuscript.manuscriptFileKey,
                coverFileKey: manuscript.coverFileKey,
                submittedAt: manuscript.updatedAt,
              },
            }
          : {}),
      },
    },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This submission changed while you were editing it. Reload and try again.');

  await notifyAuthor(updated, 'Submitted');
  res.json({ success: true, message: 'Your changes were sent back to the editors.', data: toAuthorView(updated) });
});

// ================================================================== admin: review & publish

export const getManuscripts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = req.query as unknown as { page: number; limit: number; status?: ManuscriptStatus };
  const filter: FilterQuery<IManuscript> = status ? { status } : {};

  const [manuscripts, total] = await Promise.all([
    Manuscript.find(filter)
      .select(`${ADMIN_HIDDEN_FIELDS} -history`)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Manuscript.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: manuscripts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getManuscriptById = asyncHandler(async (req: Request, res: Response) => {
  const manuscript = await Manuscript.findById(req.params.id)
    .select(ADMIN_HIDDEN_FIELDS)
    .populate('author', 'name email status emailVerified')
    .populate('book', 'slug title');
  if (!manuscript) throw ApiError.notFound('Manuscript not found');
  res.json({ success: true, data: manuscript });
});

export const updateManuscriptStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body as { status: AdminDecision; note?: string };

  const current = await Manuscript.findById(req.params.id);
  if (!current) throw ApiError.notFound('Manuscript not found');
  if (!canAdminTransition(current.status, status)) {
    throw ApiError.conflict(`A manuscript that is “${current.status}” can’t be moved to “${status}”.`);
  }

  const updated = await Manuscript.findOneAndUpdate(
    // Compare-and-set: if another admin decided first, this finds nothing instead of overwriting them.
    { _id: current._id, status: current.status },
    { $set: { status }, $push: { history: { status, note: note || undefined, actor: 'admin', by: req.user!._id, at: new Date() } } },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This manuscript was just updated by someone else. Reload it and review again.');

  await audit(req, {
    action: 'manuscript.status_changed',
    targetType: 'manuscript',
    targetId: updated.id,
    summary: `Moved “${updated.bookTitle}” from ${current.status} to ${status}`,
  });
  await notifyAuthor(updated, status, note || undefined);

  res.json({ success: true, data: updated.toObject({ transform: (_doc, ret) => omitSecrets(ret) }) });
});

export const publishManuscript = asyncHandler(async (req: Request, res: Response) => {
  const manuscript = await Manuscript.findById(req.params.id);
  if (!manuscript) throw ApiError.notFound('Manuscript not found');

  const { book, manuscript: published } = await publishToCatalogue(manuscript, req.body as PublishManuscriptInput, req.user!);

  await audit(req, {
    action: 'manuscript.published',
    targetType: 'manuscript',
    targetId: published.id,
    summary: `Published “${published.bookTitle}” to the catalogue (ISBN ${book.isbn})`,
  });
  await notifyAuthor(published, 'Published');

  res.json({
    success: true,
    data: published.toObject({ transform: (_doc, ret) => omitSecrets(ret) }),
    book: { id: book.id, slug: book.slug },
  });
});

export const getManuscriptFileUrl = asyncHandler(async (req: Request, res: Response) => {
  const manuscript = await Manuscript.findById(req.params.id);
  if (!manuscript) throw ApiError.notFound('Manuscript not found');

  const key = req.query.file === 'cover' ? manuscript.coverFileKey : manuscript.manuscriptFileKey;
  if (!key) throw ApiError.notFound('File not found for this manuscript');

  await audit(req, {
    action: 'manuscript.file_accessed',
    targetType: 'manuscript',
    targetId: manuscript.id,
    summary: `Opened the ${req.query.file === 'cover' ? 'cover' : 'manuscript'} file of “${manuscript.bookTitle}”`,
  });
  res.json({ success: true, url: await getSignedFileUrl(key, 300), expiresInSeconds: 300 });
});

// Used by the admin "upload cover image" control on book/author forms.
export const uploadCoverImage = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw ApiError.badRequest('No image provided');
  if (!isAllowedImageFile(file.buffer)) {
    throw ApiError.badRequest('File must be a genuine PNG or JPEG image');
  }
  const url = await uploadImageBuffer(file.buffer, 'covers');
  res.json({ success: true, url });
});

/** Same exclusions as the admin `select`, for documents that come back from a write instead of a query. */
function omitSecrets(ret: Record<string, unknown>): Record<string, unknown> {
  delete ret.manuscriptFileKey;
  delete ret.coverFileKey;
  delete ret.previousVersions;
  return ret;
}
