import { z } from 'zod';

export const createTestimonialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  designation: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  photoUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['published', 'unpublished']).default('unpublished'),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
