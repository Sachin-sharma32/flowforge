import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UnauthorizedError } from '../domain/errors';
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from '../utils/auth-cookies';

const authService = new AuthService();

function requireUser(req: Request): { userId: string } {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user;
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      setAuthCookies(res, result.refreshToken);
      res.status(201).json({
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
