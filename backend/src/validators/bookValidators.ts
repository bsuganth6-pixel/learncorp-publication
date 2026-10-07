import { z } from 'zod';
import { BOOK_FORMATS } from '../models/Book';
import { objectId } from './common';

const reviewSchema = z.object({
  name: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1),
});

export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.array(objectId).min(1, 'At least one author is required'),
  description: z.string().min(1, 'Description is required'),
  isbn: z.string().min(10, 'Enter a valid ISBN'),
  category: z.string().min(1, 'Category is required'),
  language: z.string().min(1).default('English'),
  publicationDate: z.coerce.date().optional(),
  pages: z.coerce.number().int().positive().optional(),
  format: z.enum(BOOK_FORMATS),
  price: z.coerce.number().min(0),
  coverImageUrl: z.string().url('Cover image is required'),
  keywords: z.array(z.string()).default([]),
  publisher: z.string().optional(),
  tableOfContents: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  reviews: z.array(reviewSchema).optional(),
});

export const updateBookSchema = createBookSchema.partial();

export const bookQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().optional(),
  author: objectId.optional(),
  format: z.enum(BOOK_FORMATS).optional(),
  language: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  year: z.coerce.number().int().optional(),
  search: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  sort: z.enum(['newest', 'oldest', 'price-asc', 'price-desc', 'title']).default('newest'),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
