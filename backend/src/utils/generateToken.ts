import jwt from 'jsonwebtoken';
import { Response } from 'express';

interface TokenPayload {
  id: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }

  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function setAuthCookie(res: Response, token: string): void {
  const name = process.env.COOKIE_NAME || 'bp_session';

  res.cookie(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',

    // Required because frontend (Vercel) and backend (Railway)
    // are on different origins.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',

    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  const name = process.env.COOKIE_NAME || 'bp_session';

  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
}
