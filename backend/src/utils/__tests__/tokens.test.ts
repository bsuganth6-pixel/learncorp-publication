import { generateOpaqueToken, hashToken } from '../tokens';
import { BCRYPT_COST, hashPassword, verifyPassword, burnPasswordCheck } from '../password';

describe('tokens', () => {
  it('are 256 bits, URL-safe and never repeat', () => {
    const tokens = new Set(Array.from({ length: 500 }, generateOpaqueToken));
    expect(tokens.size).toBe(500);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('are stored only as a deterministic SHA-256 digest that does not contain the token', () => {
    const token = generateOpaqueToken();
    const digest = hashToken(token);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).toBe(hashToken(token));
    expect(digest).not.toContain(token);
    expect(hashToken(token + 'x')).not.toBe(digest);
  });
});

describe('password hashing', () => {
  it('hashes with bcrypt, verifies, and rejects a wrong password', async () => {
    const hash = await hashPassword('Sturdy-Pass-1234');
    expect(hash).toMatch(/^\$2[aby]\$\d\d\$/);
    expect(await verifyPassword('Sturdy-Pass-1234', hash)).toBe(true);
    expect(await verifyPassword('Sturdy-Pass-12345', hash)).toBe(false);
  });

  it('salts: the same password never produces the same hash', async () => {
    expect(await hashPassword('Sturdy-Pass-1234')).not.toBe(await hashPassword('Sturdy-Pass-1234'));
  });

  it('uses the full cost factor (12) everywhere except the test environment', () => {
    expect(BCRYPT_COST).toBe(4); // under NODE_ENV=test, to keep the suite fast
    jest.isolateModules(() => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(require('../password').BCRYPT_COST).toBe(12);
      process.env.NODE_ENV = previous;
    });
  });

  it('can spend a password check without an account', async () => {
    await expect(burnPasswordCheck('whatever')).resolves.toBeUndefined();
  });
});
