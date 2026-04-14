import { randomBytes } from 'crypto';
import { Request, Response, NextFunction, type CookieOptions } from 'express';
import { AuthService } from '../services/auth.service';
import { UnauthorizedError } from '../domain/errors';
import { config } from '../config';
import {
  clearAuthCookies,
  getCookieValue,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from '../utils/auth-cookies';

const authService = new AuthService();
const oauthStateCookieName = 'ff_oauth_state';
const sameSite = config.AUTH_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none';
const oauthStateCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.AUTH_COOKIE_SECURE,
  sameSite,
  path: '/api/v1/auth/oauth',
  maxAge: 10 * 60 * 1000,
};

function requireUser(req: Request): { userId: string } {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user;
}

function readString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return '';
}

function parseOAuthProvider(input: string): 'google' | 'github' {
  if (input === 'google' || input === 'github') {
    return input;
  }
  throw new UnauthorizedError('Unsupported OAuth provider');
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.verifyEmail(req.body);
      res.json({
        success: true,
        data: {
          message: 'Email verified successfully.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmailFromLink(req: Request, res: Response, _next: NextFunction) {
    const token = readString(req.query.token);
    if (!token.trim()) {
      res.redirect(`${config.WEB_APP_URL}/login?verification=invalid`);
      return;
    }

    try {
      await authService.verifyEmail({ token });
      res.redirect(`${config.WEB_APP_URL}/login?verification=success`);
    } catch {
      res.redirect(`${config.WEB_APP_URL}/login?verification=invalid`);
    }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resendVerification(req.body);
      res.json({
        success: true,
        data: {
          message: 'If an unverified account exists, a new verification link has been sent.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async oauthStart(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = parseOAuthProvider(readString(req.params.provider));
      const state = randomBytes(24).toString('base64url');
      const authorizationUrl = authService.getOAuthAuthorizationUrl(provider, state);
      res.cookie(oauthStateCookieName, state, oauthStateCookieOptions);
      res.redirect(authorizationUrl);
    } catch (error) {
      next(error);
    }
  }

  static async oauthCallback(req: Request, res: Response, _next: NextFunction) {
    const errorRedirect = `${config.WEB_APP_URL}/login?oauth=error`;
    const providerInput = readString(req.params.provider);
    const state = readString(req.query.state);
    const code = readString(req.query.code);
    const storedState = getCookieValue(req, oauthStateCookieName);

    res.clearCookie(oauthStateCookieName, {
      httpOnly: true,
      secure: config.AUTH_COOKIE_SECURE,
      sameSite,
      path: '/api/v1/auth/oauth',
    });

    if (!state || !storedState || state !== storedState || !code) {
      clearAuthCookies(res);
      res.redirect(errorRedirect);
      return;
    }

    try {
      const provider = parseOAuthProvider(providerInput);
      const result = await authService.loginWithOAuth(provider, code);
      setAuthCookies(res, result.refreshToken);
      res.redirect(`${config.WEB_APP_URL}/dashboard`);
    } catch {
      clearAuthCookies(res);
      res.redirect(errorRedirect);
    }
  }

  static async googleOneTap(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.loginWithGoogleOneTap(req.body);
      setAuthCookies(res, result.refreshToken);
      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      setAuthCookies(res, result.refreshToken);
      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);
      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token required');
      }

      const result = await authService.refresh(refreshToken);
      setAuthCookies(res, result.refreshToken);
      res.json({
        success: true,
        data: {
          tokens: result.tokens,
        },
      });
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      clearAuthCookies(res);
      res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  }

  static async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);
      await authService.logoutAll(user.userId);
      clearAuthCookies(res);
      res.json({ success: true, data: { message: 'Logged out from all sessions successfully' } });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);
      const profile = await authService.getProfile(user.userId);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }
}
