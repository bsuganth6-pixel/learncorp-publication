import { passwordSchema, passwordProblem } from '../password';

describe('password policy', () => {
  it.each(['Sturdy-Pass-1234', 'correct horse 42 battery', 'Ünïcödé-pass-77', 'a'.repeat(30) + '1'])('accepts %s', (value) => {
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
    // 40 characters but 80 bytes
    expect(passwordSchema.safeParse('é1'.repeat(20)).success).toBe(false);
  });

  it('passwordProblem returns the first problem, or null when acceptable', () => {
    expect(passwordProblem('Sturdy-Pass-1234')).toBeNull();
    expect(passwordProblem('short')).toMatch(/at least 10/);
  });
});
