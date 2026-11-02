import { z } from 'zod';
import { PASSWORD_RULES } from '../config/auth';

// Length matters more than composition (NIST 800-63B), so the rules are: long enough, not trivially
// guessable, mixed letters and digits, and short enough for bcrypt not to truncate it.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd123', 'qwertyuiop', 'qwerty12345',
  'qwerty123456', '1234567890', '12345678910', '123456789012', '0123456789', '1q2w3e4r5t', '1qaz2wsx3edc',
  'iloveyou123', 'iloveyou1234', 'welcome123', 'welcome1234', 'letmein123', 'letmein1234', 'admin12345',
  'admin123456', 'administrator1', 'changeme123', 'changeme1234', 'change-this-immediately', 'abc1234567',
  'abcd123456', 'abcdefg123', 'monkey12345', 'dragon12345', 'football123', 'baseball123', 'master12345',
  'sunshine123', 'princess123', 'trustno1234', 'login12345', 'whatever123', 'freedom123', 'shadow12345',
  'superman123', 'michael1234', 'jennifer123', 'computer123', 'internet123', 'samsung1234', 'india123456',
  'india@12345', 'welcome@123', 'password@123', 'password@1234', 'admin@12345', 'admin@123456', 'test123456',
  'testing1234', 'learncorp123', 'learncorp1234', 'publication1', 'publisher123',
]);

export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, `Use at least ${PASSWORD_RULES.minLength} characters`)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= PASSWORD_RULES.maxBytes, {
    message: `Use at most ${PASSWORD_RULES.maxBytes} characters`,
  })
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { message: 'Include at least one letter and one number' })
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), { message: 'That password is too common — choose another' });

/** Same rules as a plain function, for scripts (admin provisioning) that don't go through Zod. */
export function passwordProblem(value: string): string | null {
  const result = passwordSchema.safeParse(value);
  return result.success ? null : result.error.issues[0].message;
}
