// Every auth/session tunable lives here so the security policy is reviewable in one file.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Server-side session lifetimes. `absoluteMs` is a hard cap from login; `idleMs` expires a session
 * that has not been used for that long. Admin sessions are deliberately short and cannot be remembered.
 */
export const SESSION_POLICY = {
  author: { absoluteMs: 12 * HOUR, idleMs: 2 * HOUR },
  authorRemembered: { absoluteMs: 30 * DAY, idleMs: 14 * DAY },
  admin: { absoluteMs: 8 * HOUR, idleMs: HOUR },
} as const;

/** Oldest sessions are revoked beyond this, so a stolen-credential loop can't grow the collection. */
export const MAX_ACTIVE_SESSIONS_PER_USER = 10;

/** `lastSeenAt` is only rewritten when older than this, so reads don't turn into a write per request. */
export const LAST_SEEN_WRITE_INTERVAL_MS = 5 * MINUTE;

export const TOKEN_TTL_MS = {
  emailVerification: 24 * HOUR,
  passwordReset: 30 * MINUTE,
} as const;

export const PASSWORD_RULES = {
  minLength: 10,
  /** bcrypt silently ignores everything past 72 bytes, so longer passwords are rejected, not truncated. */
  maxBytes: 72,
} as const;

/** Non-secret companion cookie (readable by JS) that only tells the UI whether to ask the API who is signed in. */
export const AUTH_HINT_COOKIE = 'bp_auth';

export const sessionCookieName = (): string => process.env.COOKIE_NAME || 'bp_session';

/**
 * Browser origins allowed to call this API with credentials. CLIENT_URL may list several,
 * comma-separated (e.g. the *.vercel.app address and a custom domain); the first is canonical
 * and is the one used for links in emails.
 */
export function allowedOrigins(): string[] {
  const origins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      try {
        return new URL(raw).origin;
      } catch {
        return raw.replace(/\/$/, '');
      }
    });
  return [...new Set(origins)];
}

export const clientOrigin = (): string => allowedOrigins()[0];

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/** Header every browser call from our own frontend sends; cross-site forms and simple requests can't. */
export const CLIENT_HEADER = { name: 'x-requested-with', value: 'LearnCorp' } as const;

/** Absolute link into the frontend (emails, notifications). Built from CLIENT_URL, never from request headers. */
export function clientUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(path, clientOrigin());
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}
