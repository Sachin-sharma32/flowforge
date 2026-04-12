import { randomBytes } from 'crypto';
import type { Request, Response, CookieOptions } from 'express';
import { config } from '../config';
import { parseDurationToMilliseconds } from './duration';

const refreshCookieMaxAgeMs = parseDurationToMilliseconds(config.JWT_REFRESH_EXPIRY);
const sameSite = config.AUTH_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.AUTH_COOKIE_SECURE,
  sameSite,
  path: config.AUTH_REFRESH_COOKIE_PATH,
  maxAge: refreshCookieMaxAgeMs,
};

const csrfCookieOptions: CookieOptions = {
  httpOnly: false,
  secure: config.AUTH_COOKIE_SECURE,
  sameSite,
  path: config.AUTH_CSRF_COOKIE_PATH,
  maxAge: refreshCookieMaxAgeMs,
};

export function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, chunk) => {
      const separatorIndex = chunk.indexOf('=');
      if (separatorIndex <= 0) {
        return cookies;
      }

      const key = chunk.slice(0, separatorIndex).trim();
      const rawValue = chunk.slice(separatorIndex + 1).trim();

      try {
        cookies[key] = decodeURIComponent(rawValue);
      } catch {
        cookies[key] = rawValue;
      }

      return cookies;
    }, {});
}

export function getCookieValue(req: Request, cookieName: string): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[cookieName];
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  return getCookieValue(req, config.AUTH_REFRESH_COOKIE_NAME);
}

export function getCsrfTokenFromRequest(req: Request): string | undefined {
  return getCookieValue(req, config.AUTH_CSRF_COOKIE_NAME);
}

export function setAuthCookies(res: Response, refreshToken: string): void {
  const csrfToken = randomBytes(32).toString('base64url');
  res.cookie(config.AUTH_REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.cookie(config.AUTH_CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(config.AUTH_REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.AUTH_COOKIE_SECURE,
    sameSite,
    path: config.AUTH_REFRESH_COOKIE_PATH,
  });

  res.clearCookie(config.AUTH_CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: config.AUTH_COOKIE_SECURE,
    sameSite,
    path: config.AUTH_CSRF_COOKIE_PATH,
  });
}
