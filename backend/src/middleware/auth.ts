import { Request, Response, NextFunction } from 'express';
import type { IUser, UserRole } from '../models/User';
import type { ISession } from '../models/Session';
import { resolveSession } from '../services/sessionService';
import { sessionCookieName } from '../config/auth';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
      authSession?: ISession;
    }
  }
}

/** Requires a live server-side session. Identity comes only from the database row the cookie points at. */
export const protect = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[sessionCookieName()];
  if (!token) throw ApiError.unauthorized('Please sign in to continue');

  const resolved = await resolveSession(token);
  if (!resolved) throw ApiError.unauthorized('Your session has ended. Please sign in again.');

  req.user = resolved.user;
  req.authSession = resolved.session;
  next();
});

/**
 * Role gate, evaluated on the server for every request. Admin sessions can only exist for admin
 * accounts (see resolveSession), so an author session can never satisfy an admin route.
 */
export const restrictTo = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
};

/** Authors must confirm their email before doing anything that creates content or uploads files. */
export const requireVerifiedEmail = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role === 'author' && !req.user.emailVerified) {
    throw ApiError.forbidden('Confirm your email address to continue.', 'EMAIL_NOT_VERIFIED');
  }
  next();
};

export const adminOnly = [protect, restrictTo('admin', 'superadmin')];
export const authorOnly = [protect, restrictTo('author')];
