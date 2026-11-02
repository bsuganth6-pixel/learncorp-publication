import { Schema, model, Document, Model, Types } from 'mongoose';

/** Which login produced the session. Admin routes accept only `admin` sessions. */
export const SESSION_SCOPES = ['author', 'admin'] as const;
export type SessionScope = (typeof SESSION_SCOPES)[number];

export interface ISession extends Document {
  user: Types.ObjectId;
  /** SHA-256 of the cookie value; the cookie value itself is never stored. */
  tokenHash: string;
  scope: SessionScope;
  persistent: boolean;
  ip?: string;
  userAgent?: string;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    scope: { type: String, enum: SESSION_SCOPES, required: true },
    persistent: { type: Boolean, default: false },
    ip: { type: String },
    userAgent: { type: String },
    lastSeenAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String },
  },
  { timestamps: true }
);

export const Session: Model<ISession> = model<ISession>('Session', sessionSchema);
