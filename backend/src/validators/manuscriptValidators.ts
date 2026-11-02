import { z } from 'zod';
import { BOOK_FORMATS } from '../models/Book';
import { MANUSCRIPT_STATUSES } from '../models/Manuscript';
import { ADMIN_DECISIONS, NOTE_REQUIRED } from '../services/manuscriptWorkflow';
import { httpUrl } from './common';

// multipart/form-data always sends strings; an empty optional number field arrives as "" rather than
// being absent, and z.coerce.number() turns that into 0, which then fails .positive() — so "" is
// normalised to undefined first.
const optionalPageCount = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.coerce.number().int().positive().optional()
);

// Who the author is (name, email) comes from their signed-in account, never from the form.
const manuscriptFields = {
  phone: z.string().trim().min(6, 'Enter a valid phone number').max(30),
  bookTitle: z.string().trim().min(1, 'Book title is required').max(200),
  category: z.string().min(1, 'Category is required'),
  language: z.string().min(1),
  pageCount: optionalPageCount,
  description: z.string().trim().min(20, 'Please describe the manuscript (20+ characters)').max(5000),
  authorBio: z.string().trim().min(10, 'Please add a short author bio').max(2000),
  format: z.enum(BOOK_FORMATS),
  previousExperience: z.string().max(2000).optional(),
  additionalInfo: z.string().max(2000).optional(),
};

export const submitManuscriptSchema = z.object({
  ...manuscriptFields,
  language: manuscriptFields.language.default('English'),
  // z.coerce.boolean() is a trap here: it's just JS `Boolean(x)`, and Boolean("false") is true (any
  // non-empty string is truthy) — so a literal "false" string would incorrectly pass as agreed.
  // Compare the raw string explicitly instead of coercing it.
  agreedToTerms: z
    .string()
    .transform((v) => v === 'true')
    .refine((v) => v === true, { message: 'You must accept the terms and conditions' }),
});

/**
 * Resubmission: every detail is optional (only what changed is sent) and none has a default, so
 * omitting a field can never overwrite it. The editors must be told what changed.
 */
export const resubmitManuscriptSchema = z
  .object(manuscriptFields)
  .partial()
  .extend({ note: z.string().trim().min(10, 'Tell the editors what you changed (10+ characters)').max(2000) });

export const updateManuscriptStatusSchema = z
  .object({
    status: z.enum(ADMIN_DECISIONS),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (NOTE_REQUIRED.includes(value.status) && (value.note?.length ?? 0) < 10) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'Tell the author why (10+ characters)' });
    }
  });

export const publishManuscriptSchema = z.object({
  isbn: z.string().trim().min(10, 'Enter a valid ISBN').max(20),
  price: z.coerce.number().min(0, 'Enter a price'),
  publicationDate: z.coerce.date().optional(),
  coverImageUrl: httpUrl.optional(),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const manuscriptQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(MANUSCRIPT_STATUSES).optional(),
});

export const fileQuerySchema = z.object({ file: z.enum(['manuscript', 'cover']).default('manuscript') });

export type SubmitManuscriptInput = z.infer<typeof submitManuscriptSchema>;
export type ResubmitManuscriptInput = z.infer<typeof resubmitManuscriptSchema>;
export type PublishManuscriptInput = z.infer<typeof publishManuscriptSchema>;
