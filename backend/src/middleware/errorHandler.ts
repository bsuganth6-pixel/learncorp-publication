import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { MulterError } from 'multer';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof MulterError) {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message;
  } else if (err && typeof err === 'object' && 'name' in err) {
    const e = err as { name: string; message: string; code?: number; keyValue?: Record<string, unknown> };
    if (e.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      details = e.message;
    } else if (e.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid identifier';
    } else if (e.code === 11000) {
      statusCode = 409;
      const field = e.keyValue ? Object.keys(e.keyValue)[0] : 'field';
      message = `That ${field} is already in use`;
    } else if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Invalid or expired session';
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
}
