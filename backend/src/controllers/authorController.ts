import { Request, Response } from 'express';
import { Author } from '../models/Author';
import { Book } from '../models/Book';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { toSlug } from '../utils/slug';

async function ensureUniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = toSlug(name);
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Author.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export const getAuthors = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 12, 50);
  const search = (req.query.search as string) || '';

  const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
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
  const slug = await ensureUniqueSlug(req.body.name);
  const author = await Author.create({ ...req.body, slug });
  res.status(201).json({ success: true, data: author });
});

export const updateAuthor = asyncHandler(async (req: Request, res: Response) => {
  const existing = await Author.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Author not found');

  const updates = { ...req.body };
  if (updates.name && updates.name !== existing.name) {
    updates.slug = await ensureUniqueSlug(updates.name, existing.id);
  }

  Object.assign(existing, updates);
  await existing.save();
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
  res.json({ success: true, message: 'Author deleted' });
});
