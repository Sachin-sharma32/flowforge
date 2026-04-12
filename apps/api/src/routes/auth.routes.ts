import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireCsrfToken } from '../middleware/csrf.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { registerSchema, loginSchema } from '@flowforge/shared';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), AuthController.register);
authRoutes.post('/login', authLimiter, validate(loginSchema), AuthController.login);
authRoutes.post('/refresh', authLimiter, requireCsrfToken, AuthController.refresh);
authRoutes.post('/logout', requireCsrfToken, AuthController.logout);
authRoutes.post('/logout-all', authenticate, AuthController.logoutAll);
authRoutes.get('/me', authenticate, AuthController.me);
