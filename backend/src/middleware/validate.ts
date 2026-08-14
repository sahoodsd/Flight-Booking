import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { badRequest } from '../utils/AppError';

type Target = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, target: Target = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      return next(badRequest(message, 'VALIDATION_ERROR'));
    }
    req[target] = result.data;
    next();
  };