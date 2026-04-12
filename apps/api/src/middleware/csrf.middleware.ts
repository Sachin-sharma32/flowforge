import { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../domain/errors';
import { getCsrfTokenFromRequest } from '../utils/auth-cookies';

export function requireCsrfToken(req: Request, _res: Response, next: NextFunction): void {
  const csrfCookieToken = getCsrfTokenFromRequest(req);
  const headerValue = req.headers['x-csrf-token'];
  const csrfHeaderToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!csrfCookieToken || !csrfHeaderToken || csrfCookieToken !== csrfHeaderToken) {
    next(new ForbiddenError('Invalid CSRF token'));
    return;
  }

  next();
}
