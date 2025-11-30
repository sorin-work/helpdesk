export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Please sign in') =>
  new AppError(401, 'unauthorized', message);

export const forbidden = (message = 'You do not have access to this') =>
  new AppError(403, 'forbidden', message);

export const notFound = (what = 'Resource') => new AppError(404, 'not_found', `${what} not found`);

export const conflict = (message: string) => new AppError(409, 'conflict', message);
