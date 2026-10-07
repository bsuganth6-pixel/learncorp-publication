import { Request, Response } from 'express';
import { Book } from '../models/Book';
import { Author } from '../models/Author';
import { asyncHandler } from '../utils/asyncHandler';

// Public, read-only counts for the homepage. Deliberately limited to numbers
// that are real and already public (published books, authors, categories).
export const getPublicStats = asyncHandler(async (_req: Request, res: Response) => {
  const [publishedBooks, authors, categories] = await Promise.all([
    Book.countDocuments({ status: 'published' }),
    Author.countDocuments(),
    Book.distinct('category', { status: 'published' }),
  ]);

  res.json({ success: true, data: { publishedBooks, authors, categories: categories.length } });
});
