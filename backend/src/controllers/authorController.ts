import { Request, Response } from 'express';
import { Author } from '../models/Author';
import { Book } from '../models/Book';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/escapeRegex';
import { uniqueAuthorSlug } from '../services/slugService';
import { audit } from '../services/auditService';
import type { AuthorQuery } from '../validators/authorValidators';

export const getAuthors = asyncHandler(async (req: Request, res: Response) => {
  // Already validated and coerced by authorQuerySchema (routes/authorRoutes.ts).
  const { page, limit, search } = req.query as unknown as AuthorQuery;

  const filter = search ? { name: new RegExp(escapeRegex(search), 'i') } : {};
  const skip = (page - 1) * limit;

  const [authors, total] = await Promise.all([
    Author.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Author.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: authors,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getAuthorBySlug = asyncHandler(async (req: Request, res: Response) => {
  const author = await Author.findOne({ slug: req.params.slug });
  if (!author) throw ApiError.notFound('Author not found');

  const books = await Book.find({ authors: author._id, status: 'published' }).select(
    'title slug coverImageUrl price category'
  );

  res.json({ success: true, data: author, books });
});

export const createAuthor = asyncHandler(async (req: Request, res: Response) => {
  const slug = await uniqueAuthorSlug(req.body.name);
  const author = await Author.create({ ...req.body, slug });
  await audit(req, { action: 'author.created', targetType: 'author', targetId: author.id, summary: `Created author profile “${author.name}”` });
  res.status(201).json({ success: true, data: author });
});

export const updateAuthor = asyncHandler(async (req: Request, res: Response) => {
  const existing = await Author.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Author not found');

  const updates = { ...req.body };
  if (updates.name && updates.name !== existing.name) {
    updates.slug = await uniqueAuthorSlug(updates.name, existing.id);
  }

  Object.assign(existing, updates);
  await existing.save();
  await audit(req, { action: 'author.updated', targetType: 'author', targetId: existing.id, summary: `Updated author profile “${existing.name}”` });
  res.json({ success: true, data: existing });
});

export const deleteAuthor = asyncHandler(async (req: Request, res: Response) => {
  const bookCount = await Book.countDocuments({ authors: req.params.id });
  if (bookCount > 0) {
    throw ApiError.conflict(
      `This author is credited on ${bookCount} book(s). Reassign or remove those books first.`
    );
  }
  const author = await Author.findByIdAndDelete(req.params.id);
  if (!author) throw ApiError.notFound('Author not found');
  await audit(req, { action: 'author.deleted', targetType: 'author', targetId: author.id, summary: `Deleted author profile “${author.name}”` });
  res.json({ success: true, message: 'Author deleted' });
});
