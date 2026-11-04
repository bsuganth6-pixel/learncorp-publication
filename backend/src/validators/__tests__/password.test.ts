import { passwordSchema, passwordProblem } from '../password';

describe('password policy', () => {
  it.each(['Sturdy-Pass-1234', 'correct horse 42 battery', 'Ünïcödé-pass-77', 'a'.repeat(30) + '1', 'पासवर्ड-हिंदी-2026', 'கடவுச்சொல்-பாதுகாப்பு-7'])('accepts %s', (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ['Abc12345', /at least 10/],
    ['onlyletterslongenough', /letter and one number/],
    ['12345678901234', /letter and one number/],
    ['Password123', /too common/],
    ['change-this-immediately', /too common/],
    ['a1'.repeat(37), /at most 72/],
  ])('rejects %s', (value, message) => {
    const result = passwordSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message).join(' ')).toMatch(message);
  });

  it('measures the limit in bytes, because bcrypt would silently truncate beyond 72', () => {
    // 38 characters, but each é is 2 bytes in UTF-8: 2 + 36*2 = 74 bytes — over the limit although well under 72 characters
    const tooManyBytes = passwordSchema.safeParse(`a1${'é'.repeat(36)}`);
    expect(tooManyBytes.success).toBe(false);
    expect(tooManyBytes.error?.issues.map((i) => i.message).join(' ')).toMatch(/at most 72/);
    // exactly 72 bytes is fine
    expect(passwordSchema.safeParse(`a1${'é'.repeat(35)}`).success).toBe(true);
  });

  it('passwordProblem returns the first problem, or null when acceptable', () => {
    expect(passwordProblem('Sturdy-Pass-1234')).toBeNull();
    expect(passwordProblem('short')).toMatch(/at least 10/);
  });
});
