import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

// Validates req[source] against a Zod schema and replaces it with the parsed
// (and type-coerced) result, so controllers can trust the shape downstream.
export const validate = (schema: ZodType, source: Source = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw ApiError.badRequest('Validation failed', z.flattenError(result.error).fieldErrors);
    }
    req[source] = result.data;
    next();
  };
};
