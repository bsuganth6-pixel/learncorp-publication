import { describe, it, expect } from 'vitest';
import { passwordChecks, meetsPasswordRules, passwordStrength, PASSWORD_MAX_BYTES } from '../password';

describe('password rules (mirror of the API policy)', () => {
  it.each(['Sturdy-Pass-1234', 'correct horse 42 battery', 'a'.repeat(30) + '1', 'पासवर्ड-हिंदी-2026', 'Ünïcödé-pass-77'])('accepts %s', (v) => expect(meetsPasswordRules(v)).toBe(true));

  it.each(['', 'short1', 'onlyletterslongenough', '12345678901234', 'a1'.repeat(37)])('rejects %j', (v) => expect(meetsPasswordRules(v)).toBe(false));

  it('counts bytes, not characters, for the upper limit (bcrypt truncates at 72 bytes)', () => {
    expect(PASSWORD_MAX_BYTES).toBe(72);
    const tooManyBytes = `a1${'é'.repeat(36)}`; // 38 characters, 74 bytes
    expect(meetsPasswordRules(tooManyBytes)).toBe(false);
    expect(passwordChecks(tooManyBytes).find((c) => c.id === 'max')?.ok).toBe(false);
    expect(meetsPasswordRules(`a1${'é'.repeat(35)}`)).toBe(true); // exactly 72 bytes
  });

  it('reports each rule separately so the checklist can tick them off', () => {
    const checks = Object.fromEntries(passwordChecks('abcdefghij').map((c) => [c.id, c.ok]));
    expect(checks).toEqual({ length: true, mix: false, max: true });
  });
});

describe('passwordStrength', () => {
  it('is 0 when empty, 1 when the rules are not met, then grows with length and variety', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc')).toBe(1);
    expect(passwordStrength('abcdefghi1')).toBe(2);
    expect(passwordStrength('Sturdy-Pass-1234')).toBe(3);
    expect(passwordStrength('Correct-Horse-Battery-Staple-42')).toBe(4);
  });

  it('does not reward a long run of one repeated character', () => {
    expect(passwordStrength('a1'.repeat(15))).toBeLessThanOrEqual(2);
  });
});
