/**
 * Mirrors the rules the API enforces (backend/src/validators/password.ts) so people see what is
 * needed as they type. The server is the authority: it also rejects very common passwords, which
 * this file deliberately does not try to replicate.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export interface PasswordCheck {
  id: 'length' | 'mix' | 'max';
  label: string;
  ok: boolean;
}

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, ok: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'mix', label: 'A letter and a number', ok: /\p{L}/u.test(password) && /\p{N}/u.test(password) },
    { id: 'max', label: `No more than ${PASSWORD_MAX_BYTES} characters`, ok: byteLength(password) <= PASSWORD_MAX_BYTES },
  ];
}

export const meetsPasswordRules = (password: string): boolean => passwordChecks(password).every((c) => c.ok);

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

/** 0 = empty, 1 = does not meet the rules, 2 = meets them, 3 = good, 4 = strong. A guide, not a guarantee. */
export function passwordStrength(password: string): StrengthLevel {
  if (!password) return 0;
  if (!meetsPasswordRules(password)) return 1;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const uniqueChars = new Set(password).size;
  let score = 2;
  if (password.length >= 14 && classes >= 3 && uniqueChars >= 8) score = 3;
  if (password.length >= 18 && classes >= 3 && uniqueChars >= 10) score = 4;
  return score as StrengthLevel;
}

export const STRENGTH_LABEL: Record<StrengthLevel, string> = {
  0: '', 1: 'Too weak', 2: 'Acceptable', 3: 'Good', 4: 'Strong',
};
