import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const protect = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const cookieName = process.env.COOKIE_NAME || 'bp_session';
  const token = req.cookies?.[cookieName];

  if (!token) throw ApiError.unauthorized('Please log in to continue');

  let decoded: { id: string; role: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };
  } catch {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  req.user = user;
  next();
});

export const restrictTo = (...roles: Array<'admin' | 'superadmin'>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
};
