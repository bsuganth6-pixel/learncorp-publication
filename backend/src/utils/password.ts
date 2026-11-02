import bcrypt from 'bcryptjs';

// bcrypt (cost 12) keeps every existing admin hash valid. Argon2id would need a native module on the
// host; the spec allows either, so the compatible choice wins.
// Tests drop to the minimum cost so hundreds of accounts can be created quickly; every other environment uses 12.
export const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_COST);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

let dummyHash: Promise<string> | undefined;

/**
 * Spends the same time as a real password check. Called when the account doesn't exist (or isn't
 * allowed to use this login) so response time doesn't reveal which emails are registered.
 */
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= hashPassword('timing-equalisation-only');
  await verifyPassword(plain, await dummyHash);
}
