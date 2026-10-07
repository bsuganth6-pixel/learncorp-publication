import { z } from 'zod';

export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// z.string().url() accepts any scheme (javascript:, data:, ...). Anything stored
// here is later rendered as a link or image source, so only http(s) is allowed.
export const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: 'Must be an http(s) URL' });

/** Optional http(s) URL where an empty string means "not set". */
export const optionalHttpUrl = httpUrl.optional().or(z.literal(''));
