export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFound(message = 'Resource not found') {
  return new AppError(message, 404, 'NOT_FOUND');
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden') {
  return new AppError(message, 403, 'FORBIDDEN');
}

export function badRequest(message = 'Bad request') {
  return new AppError(message, 400, 'BAD_REQUEST');
}

export function tooManyRequests(message = 'Too many requests') {
  return new AppError(message, 429, 'TOO_MANY_REQUESTS');
}

export function conflict(message = 'Conflict') {
  return new AppError(message, 409, 'CONFLICT');
}
