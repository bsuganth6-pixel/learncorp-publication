import { Types } from 'mongoose';
import { AuthToken, IAuthToken, AuthTokenType } from '../models/AuthToken';
import { TOKEN_TTL_MS } from '../config/auth';
import { generateOpaqueToken, hashToken } from '../utils/tokens';

const ttlFor = (type: AuthTokenType): number =>
  type === 'email_verification' ? TOKEN_TTL_MS.emailVerification : TOKEN_TTL_MS.passwordReset;

/** Issues a single-use token and returns the raw value to email. Earlier unused links of the same kind stop working. */
export async function issueAuthToken(userId: Types.ObjectId, type: AuthTokenType): Promise<string> {
  await AuthToken.updateMany({ user: userId, type, usedAt: null }, { $set: { usedAt: new Date() } });
  const token = generateOpaqueToken();
  await AuthToken.create({
    user: userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlFor(type)),
  });
  return token;
}

const liveFilter = (raw: string, type: AuthTokenType) => ({
  tokenHash: hashToken(raw),
  type,
  usedAt: null,
  expiresAt: { $gt: new Date() },
});

/** Checks a token without spending it (used to validate a reset link before showing the form). */
export async function peekAuthToken(raw: string, type: AuthTokenType): Promise<IAuthToken | null> {
  return AuthToken.findOne(liveFilter(raw, type));
}

/** Atomically marks the token used; of two concurrent requests with the same link, only one gets it. */
export async function consumeAuthToken(raw: string, type: AuthTokenType): Promise<IAuthToken | null> {
  return AuthToken.findOneAndUpdate(liveFilter(raw, type), { $set: { usedAt: new Date() } }, { new: true });
}

/** Voids every outstanding token of a kind for a user (after a successful reset, say). */
export async function voidAuthTokens(userId: Types.ObjectId, type: AuthTokenType): Promise<void> {
  await AuthToken.updateMany({ user: userId, type, usedAt: null }, { $set: { usedAt: new Date() } });
}
