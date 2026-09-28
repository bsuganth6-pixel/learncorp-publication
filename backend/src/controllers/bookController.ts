import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { Book, IBook } from '../models/Book';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { toSlug } from '../utils/slug';

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  title: { title: 1 },
};

type BookQuery = {
  page: number; limit: number; category?: string; author?: string; format?: string;
  language?: string; minPrice?: number; maxPrice?: number; year?: number;
  search?: string; status?: string; sort: string;
};

async function queryBooks(req: Request, res: Response, forcedStatus: 'published' | undefined) {
  const {
    page, limit, category, author, format, language,
    minPrice, maxPrice, year, search, status, sort,
  } = req.query as unknown as BookQuery;

  const filter: FilterQuery<IBook> = {};
  // Public listing always forces "published"; the admin listing (a
  // separate, protected route) may filter by any status or omit it for all.
  filter.status = forcedStatus ?? status;
  if (category) filter.category = category;
  if (author) filter.authors = author;
  if (format) filter.format = format;
  if (language) filter.language = language;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = minPrice;
    if (maxPrice) filter.price.$lte = maxPrice;
  }
  if (year) {
    filter.publicationDate = {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${year + 1}-01-01`),
    };
  }
  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * limit;
  const [books, total] = await Promise.all([
    Book.find(filter)
      .populate('authors', 'name slug photoUrl')
      .sort(SORT_MAP[sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: books,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export const getBooks = asyncHandler((req: Request, res: Response) => queryBooks(req, res, 'published'));

export const getAdminBooks = asyncHandler((req: Request, res: Response) => queryBooks(req, res, undefined));

export const getBookBySlug = asyncHandler(async (req: Request, res: Response) => {
  const book = await Book.findOne({ slug: req.params.slug }).populate(
    'authors',
    'name slug photoUrl bio'
  );
  if (!book || book.status !== 'published') {
    throw ApiError.notFound('Book not found');
  }

  const related = await Book.find({
    _id: { $ne: book._id },
    category: book.category,
    status: 'published',
  })
    .limit(4)
    .select('title slug coverImageUrl price authors')
    .populate('authors', 'name slug');

  res.json({ success: true, data: book, related });
});

export const getAdminBookById = asyncHandler(async (req: Request, res: Response) => {
  const book = await Book.findById(req.params.id).populate('authors', 'name slug');
  if (!book) throw ApiError.notFound('Book not found');
  res.json({ success: true, data: book });
});

async function ensureUniqueSlug(title: string, ignoreId?: string): Promise<string> {
  const base = toSlug(title);
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Book.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export const createBook = asyncHandler(async (req: Request, res: Response) => {
  const slug = await ensureUniqueSlug(req.body.title);
  const book = await Book.create({ ...req.body, slug });
  res.status(201).json({ success: true, data: book });
});

export const updateBook = asyncHandler(async (req: Request, res: Response) => {
  const existing = await Book.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Book not found');

  const updates = { ...req.body };
  if (updates.title && updates.title !== existing.title) {
    updates.slug = await ensureUniqueSlug(updates.title, existing.id);
  }

  Object.assign(existing, updates);
  await existing.save();
  res.json({ success: true, data: existing });
});

export const deleteBook = asyncHandler(async (req: Request, res: Response) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) throw ApiError.notFound('Book not found');
  res.json({ success: true, message: 'Book deleted' });
});

export const addReview = asyncHandler(async (req: Request, res: Response) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found');
  book.reviews.push({ ...req.body, createdAt: new Date() });
  await book.save();
  res.status(201).json({ success: true, data: book });
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found');
  const index = Number(req.params.reviewIndex);
  if (!Number.isInteger(index) || index < 0 || index >= book.reviews.length) {
    throw ApiError.notFound('Review not found');
  }
  book.reviews.splice(index, 1);
  await book.save();
  res.json({ success: true, data: book });
});
