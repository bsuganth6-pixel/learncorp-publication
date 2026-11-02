import { Request } from 'express';
import { Types } from 'mongoose';
import { Session, ISession, SessionScope } from '../models/Session';
import { User, IUser, isAdminRole } from '../models/User';
import {
  SESSION_POLICY, MAX_ACTIVE_SESSIONS_PER_USER, LAST_SEEN_WRITE_INTERVAL_MS,
} from '../config/auth';
import { generateOpaqueToken, hashToken } from '../utils/tokens';
import { getClientIp, getUserAgent } from '../utils/clientInfo';

type Lifetime = { absoluteMs: number; idleMs: number };

function lifetimeFor(scope: SessionScope, persistent: boolean): Lifetime {
  if (scope === 'admin') return SESSION_POLICY.admin;
  return persistent ? SESSION_POLICY.authorRemembered : SESSION_POLICY.author;
}

export interface IssuedSession {
  /** Raw cookie value. Exists only here and in the browser — the database holds its hash. */
  token: string;
  session: ISession;
  /** Set only for "remember me" sessions; everything else is a browser-session cookie. */
  cookieMaxAgeMs?: number;
}

/**
 * Always mints a brand-new token. A client-supplied session id is never adopted, which is what
 * prevents session fixation; callers also revoke whatever session the request arrived with.
 */
export async function createSession(opts: {
  user: IUser;
  scope: SessionScope;
  persistent?: boolean;
  req: Request;
}): Promise<IssuedSession> {
  const persistent = opts.scope === 'author' && Boolean(opts.persistent);
  const lifetime = lifetimeFor(opts.scope, persistent);
  const now = Date.now();
  const token = generateOpaqueToken();

  const session = await Session.create({
    user: opts.user._id,
    tokenHash: hashToken(token),
    scope: opts.scope,
    persistent,
    ip: getClientIp(opts.req),
    userAgent: getUserAgent(opts.req),
    lastSeenAt: new Date(now),
    expiresAt: new Date(now + lifetime.absoluteMs),
  });

  await enforceSessionCap(opts.user._id);
  return { token, session, cookieMaxAgeMs: persistent ? lifetime.absoluteMs : undefined };
}

/** Returns the live session and its user, or null if the token is unknown, expired, idle, revoked or the account is blocked. */
export async function resolveSession(token: string | undefined): Promise<{ session: ISession; user: IUser } | null> {
  if (!token || token.length > 200) return null;

  const session = await Session.findOne({ tokenHash: hashToken(token) });
  if (!session || session.revokedAt) return null;

  const now = Date.now();
  const lifetime = lifetimeFor(session.scope, session.persistent);
  if (session.expiresAt.getTime() <= now) return null;
  if (now - session.lastSeenAt.getTime() > lifetime.idleMs) return null;

  const user = await User.findById(session.user);
  if (!user || user.status === 'suspended') return null;
  // A session is only as good as the role it was issued for: a role change invalidates it.
  if (session.scope === 'admin' ? !isAdminRole(user.role) : user.role !== 'author') return null;

  if (now - session.lastSeenAt.getTime() > LAST_SEEN_WRITE_INTERVAL_MS) {
    session.lastSeenAt = new Date(now);
    await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: session.lastSeenAt } });
  }
  return { session, user };
}

const revokeFilter = { revokedAt: null } as const;

export async function revokeSessionByToken(token: string | undefined, reason: string): Promise<void> {
  if (!token || token.length > 200) return;
  await Session.updateOne(
    { tokenHash: hashToken(token), ...revokeFilter },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
}

/** Revokes one of `userId`'s sessions. Returns false if it doesn't exist, isn't theirs, or is already revoked. */
export async function revokeUserSession(userId: Types.ObjectId | string, sessionId: string, reason: string): Promise<boolean> {
  const result = await Session.updateOne(
    { _id: sessionId, user: userId, ...revokeFilter },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
  return result.modifiedCount > 0;
}

export async function revokeAllUserSessions(
  userId: Types.ObjectId | string,
  reason: string,
  exceptSessionId?: Types.ObjectId | string
): Promise<number> {
  const result = await Session.updateMany(
    { user: userId, ...revokeFilter, ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}) },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
  return result.modifiedCount;
}

export async function listActiveSessions(userId: Types.ObjectId | string): Promise<ISession[]> {
  const now = Date.now();
  const sessions = await Session.find({ user: userId, ...revokeFilter, expiresAt: { $gt: new Date(now) } }).sort({
    lastSeenAt: -1,
  });
  return sessions.filter((s) => now - s.lastSeenAt.getTime() <= lifetimeFor(s.scope, s.persistent).idleMs);
}

async function enforceSessionCap(userId: Types.ObjectId): Promise<void> {
  const active = await Session.find({ user: userId, ...revokeFilter, expiresAt: { $gt: new Date() } }).sort({
    createdAt: 1,
  });
  const excess = active.length - MAX_ACTIVE_SESSIONS_PER_USER;
  if (excess <= 0) return;
  await Session.updateMany(
    { _id: { $in: active.slice(0, excess).map((s) => s._id) } },
    { $set: { revokedAt: new Date(), revokedReason: 'session_limit' } }
  );
}
