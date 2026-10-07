import { z } from 'zod';
import { optionalHttpUrl } from './common';

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

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
