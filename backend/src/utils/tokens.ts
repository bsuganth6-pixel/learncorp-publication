import { randomBytes, createHash } from 'crypto';

/** 256 bits from the OS CSPRNG, URL-safe. Used for session cookies and email links. */
export const generateOpaqueToken = (): string => randomBytes(32).toString('base64url');

/**
 * Only this digest is stored, so a leaked database can't be replayed as live sessions or reset links.
 * Plain SHA-256 is right here (not a password hash): the input is already 256 bits of randomness.
 */
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
