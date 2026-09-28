import { z } from 'zod';

const socialLinksSchema = z
  .object({
    website: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    instagram: z.string().url().optional().or(z.literal('')),
    facebook: z.string().url().optional().or(z.literal('')),
  })
  .optional();

export const createAuthorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  qualifications: z.string().optional(),
  socialLinks: socialLinksSchema,
});

export const updateAuthorSchema = createAuthorSchema.partial();

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
