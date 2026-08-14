export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (msg: string, code = 'BAD_REQUEST') => new AppError(msg, 400, code);
export const unauthorized = (msg = 'Unauthorized', code = 'UNAUTHORIZED') => new AppError(msg, 401, code);
export const forbidden = (msg = 'Forbidden', code = 'FORBIDDEN') => new AppError(msg, 403, code);
export const notFound = (msg = 'Not found', code = 'NOT_FOUND') => new AppError(msg, 404, code);
export const conflict = (msg: string, code = 'CONFLICT') => new AppError(msg, 409, code);