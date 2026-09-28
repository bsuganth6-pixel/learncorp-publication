import { z } from 'zod';
import { BOOK_FORMATS } from '../models/Book';
import { MANUSCRIPT_STATUSES } from '../models/Manuscript';

export const submitManuscriptSchema = z.object({
  authorName: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  bookTitle: z.string().min(1, 'Book title is required'),
  category: z.string().min(1, 'Category is required'),
  language: z.string().min(1).default('English'),
  pageCount: z.coerce.number().int().positive().optional(),
  description: z.string().min(20, 'Please describe the manuscript (20+ characters)'),
  authorBio: z.string().min(10, 'Please add a short author bio'),
  format: z.enum(BOOK_FORMATS),
  previousExperience: z.string().optional(),
  additionalInfo: z.string().optional(),
  agreedToTerms: z.coerce.boolean().refine((v) => v === true, {
    message: 'You must accept the terms and conditions',
  }),
});

export const updateManuscriptStatusSchema = z.object({
  status: z.enum(MANUSCRIPT_STATUSES),
});

export type SubmitManuscriptInput = z.infer<typeof submitManuscriptSchema>;
