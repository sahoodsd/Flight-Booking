import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
  }

  // anything unexpected — log it, never leak internals to the client
  console.error(err);
  return res.status(500).json({
    error: { message: 'Something went wrong', code: 'INTERNAL_ERROR' },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Route not found', code: 'ROUTE_NOT_FOUND' } });
}