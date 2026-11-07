import { Request } from 'express';
import rateLimit, { Options } from 'express-rate-limit';

// Limits are per process (in-memory). A single API instance — the recommended deployment — enforces
// them exactly; running several instances needs a shared store (e.g. Redis), noted in docs/DEPLOYMENT.md.

const MINUTE = 60 * 1000;
const base = { standardHeaders: true, legacyHeaders: false } as const;
const reply = (message: string) => ({ success: false, message });

/** Bucket by the email in the body, so one account can't be hammered from many IPs. */
const byEmail = (req: Request): string => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
  return email ? `email:${email}` : `ip:${req.ip}`;
};

const byUser = (req: Request): string => `user:${req.user?.id ?? req.ip}`;

function limiter(options: Partial<Options>) {
  return rateLimit({ ...base, ...options });
}

// ---- Sign-in: only failed attempts (status >= 400) use up the budget ----
const LOGIN_MESSAGE = 'Too many sign-in attempts. Try again in a few minutes.';
export const loginLimiter = limiter({ windowMs: 15 * MINUTE, limit: 10, skipSuccessfulRequests: true, message: reply(LOGIN_MESSAGE) });
export const loginEmailLimiter = limiter({ windowMs: 15 * MINUTE, limit: 8, skipSuccessfulRequests: true, keyGenerator: byEmail, message: reply(LOGIN_MESSAGE) });
// Admin sign-in is stricter on both axes.
export const adminLoginLimiter = limiter({ windowMs: 15 * MINUTE, limit: 6, skipSuccessfulRequests: true, message: reply(LOGIN_MESSAGE) });
export const adminLoginEmailLimiter = limiter({ windowMs: 15 * MINUTE, limit: 5, skipSuccessfulRequests: true, keyGenerator: byEmail, message: reply(LOGIN_MESSAGE) });

// ---- Anything that sends mail or creates accounts: every request counts ----
export const registerLimiter = limiter({ windowMs: 60 * MINUTE, limit: 10, message: reply('Too many sign-up attempts. Please try again later.') });
const RECOVERY_MESSAGE = 'Too many requests. Please try again later.';
export const recoveryIpLimiter = limiter({ windowMs: 60 * MINUTE, limit: 10, message: reply(RECOVERY_MESSAGE) });
export const recoveryEmailLimiter = limiter({ windowMs: 60 * MINUTE, limit: 3, keyGenerator: byEmail, message: reply(RECOVERY_MESSAGE) });
export const resendVerificationLimiter = limiter({ windowMs: 60 * MINUTE, limit: 5, keyGenerator: byUser, message: reply('You’ve requested several confirmation emails. Please try again later.') });

// ---- Link/token endpoints and password changes ----
export const tokenLimiter = limiter({ windowMs: 15 * MINUTE, limit: 30, message: reply('Too many attempts. Please try again later.') });
export const passwordChangeLimiter = limiter({ windowMs: 15 * MINUTE, limit: 8, skipSuccessfulRequests: true, keyGenerator: byUser, message: reply('Too many attempts. Please try again later.') });

// ---- Unchanged from before ----
export const formLimiter = limiter({ windowMs: 60 * MINUTE, limit: 8, message: reply('Too many submissions. Please try again later.') });
// A coarse per-IP ceiling for the whole API. Signed-in pages make several calls each and a campus or office can share
// one address, so the default is generous; the endpoints that matter (sign-in, sign-up, recovery) have their own tight limits.
const DEFAULT_API_LIMIT = 1000;
export const apiLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: () => Number(process.env.API_RATE_LIMIT) || DEFAULT_API_LIMIT,
});
