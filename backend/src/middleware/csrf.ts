import { Request, Response, NextFunction } from 'express';
import { allowedOrigins, CLIENT_HEADER, sessionCookieName } from '../config/auth';
import { ApiError } from '../utils/ApiError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated requests, layered on top of SameSite cookies:
 *  1. If the browser says where the request came from (Origin), it must be one of our own origins.
 *  2. A request carrying the session cookie must also carry our custom header. A page on another
 *     site can't add that header without a CORS preflight, which this API refuses.
 * Requests without the session cookie have no ambient authority to abuse, so they only get check 1.
 * Safe methods never change state, so they pass.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin && !allowedOrigins().includes(origin)) {
    throw ApiError.forbidden('Cross-site request blocked');
  }

  const hasSession = Boolean(req.cookies?.[sessionCookieName()]);
  if (hasSession && req.get(CLIENT_HEADER.name) !== CLIENT_HEADER.value) {
    throw ApiError.forbidden('Cross-site request blocked');
  }
  next();
}
