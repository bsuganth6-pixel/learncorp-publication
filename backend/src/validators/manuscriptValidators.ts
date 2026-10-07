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
  // multipart/form-data always sends strings; an empty optional number field
  // arrives as "" rather than being absent, and z.coerce.number() turns that
  // into 0, which then fails .positive() — normalize "" to undefined first.
  pageCount: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
  description: z.string().min(20, 'Please describe the manuscript (20+ characters)'),
  authorBio: z.string().min(10, 'Please add a short author bio'),
  format: z.enum(BOOK_FORMATS),
  previousExperience: z.string().optional(),
  additionalInfo: z.string().optional(),
  // z.coerce.boolean() is a trap here: it's just JS `Boolean(x)`, and
  // Boolean("false") is true (any non-empty string is truthy) — so a
  // literal "false" string would incorrectly pass as agreed. Compare the
  // raw string explicitly instead of coercing it.
  agreedToTerms: z
    .string()
    .transform((v) => v === 'true')
    .refine((v) => v === true, { message: 'You must accept the terms and conditions' }),
});

export const updateManuscriptStatusSchema = z.object({
  status: z.enum(MANUSCRIPT_STATUSES),
});

export type SubmitManuscriptInput = z.infer<typeof submitManuscriptSchema>;
