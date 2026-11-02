import { Schema, model, Document, Model, Types } from 'mongoose';

export const AUTH_TOKEN_TYPES = ['email_verification', 'password_reset'] as const;
export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];

export interface IAuthToken extends Document {
  user: Types.ObjectId;
  type: AuthTokenType;
  /** SHA-256 of the emailed token; the token itself exists only in the email. */
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const authTokenSchema = new Schema<IAuthToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: AUTH_TOKEN_TYPES, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuthToken: Model<IAuthToken> = model<IAuthToken>('AuthToken', authTokenSchema);
