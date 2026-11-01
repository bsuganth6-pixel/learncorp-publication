import { z } from 'zod';
import { optionalHttpUrl, paginationSchema } from './common';

const socialLinksSchema = z
  .object({
    website: optionalHttpUrl,
    twitter: optionalHttpUrl,
    linkedin: optionalHttpUrl,
    instagram: optionalHttpUrl,
    facebook: optionalHttpUrl,
  })
  .optional();

export const createAuthorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  photoUrl: optionalHttpUrl,
  qualifications: z.string().optional(),
  socialLinks: socialLinksSchema,
});

export const updateAuthorSchema = createAuthorSchema.partial();

export const authorQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
});

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
export type AuthorQuery = z.infer<typeof authorQuerySchema>;
