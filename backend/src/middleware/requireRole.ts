import { Request, Response, NextFunction } from 'express';
import { forbidden } from '../utils/AppError';

export function requireRole(...roles: Array<'user' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}