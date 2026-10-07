import { Request, Response } from 'express';
import { Book } from '../models/Book';
import { Author } from '../models/Author';
import { Manuscript } from '../models/Manuscript';
import { ContactMessage } from '../models/ContactMessage';
import { Testimonial } from '../models/Testimonial';
import { asyncHandler } from '../utils/asyncHandler';

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalBooks,
    publishedBooks,
    totalAuthors,
    manuscriptsByStatus,
    unreadMessages,
    pendingTestimonials,
  ] = await Promise.all([
    Book.countDocuments(),
    Book.countDocuments({ status: 'published' }),
    Author.countDocuments(),
    Manuscript.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ContactMessage.countDocuments({ read: false }),
    Testimonial.countDocuments({ status: 'unpublished' }),
  ]);

  const manuscriptCounts = manuscriptsByStatus.reduce(
    (acc: Record<string, number>, row: { _id: string; count: number }) => {
      acc[row._id] = row.count;
      return acc;
    },
    {}
  );

  res.json({
    success: true,
    data: {
      totalBooks,
      publishedBooks,
      draftBooks: totalBooks - publishedBooks,
      totalAuthors,
      manuscripts: manuscriptCounts,
      unreadMessages,
      pendingTestimonials,
    },
  });
});
