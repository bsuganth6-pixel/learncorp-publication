import { z } from 'zod';
import { passwordSchema } from './password';
import { optionalHttpUrl } from './common';

const email = z.string().trim().toLowerCase().max(254).email('Enter a valid email address');

const personName = z
  .string()
  .trim()
  .min(2, 'Enter your full name')
  .max(80, 'Name is too long')
  .regex(/^[^<>\u0000-\u001f]+$/, 'Name contains characters that are not allowed');

// "" means "not provided" because forms always submit the field.
const optionalPhone = z
  .string()
  .trim()
  .regex(/^[0-9+()\-\s.]{6,30}$/, 'Enter a valid phone number')
  .optional()
  .or(z.literal(''));

const confirmMatches = <T extends { password: string; confirmPassword: string }>(data: T) =>
  data.password === data.confirmPassword;

export const registerSchema = z
  .object({
    name: personName,
    email,
    phone: optionalPhone,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: 'You must accept the terms and conditions' }),
  })
  .refine(confirmMatches, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.password.toLowerCase() !== d.email, {
    path: ['password'],
    message: 'Password must not be your email address',
  });

export const loginSchema = z.object({
  email,
  // Policy is deliberately not applied here: it would reject (and reveal) accounts created under older rules.
  password: z.string().min(1, 'Password is required').max(200),
  rememberMe: z.boolean().optional(),
});

export const adminLoginSchema = loginSchema.omit({ rememberMe: true });

export const forgotPasswordSchema = z.object({ email });

const tokenField = z.string().trim().min(20, 'Invalid link').max(200, 'Invalid link');

export const tokenSchema = z.object({ token: tokenField });

export const resetPasswordSchema = z
  .object({ token: tokenField, password: passwordSchema, confirmPassword: z.string() })
  .refine(confirmMatches, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(confirmMatches, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.password !== d.currentPassword, {
    path: ['password'],
    message: 'Choose a password you have not used here before',
  });

export const updateProfileSchema = z
  .object({
    name: personName,
    phone: optionalPhone,
    bio: z.string().trim().max(1000, 'Keep your bio under 1,000 characters'),
    website: optionalHttpUrl,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
