import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '@flowforge/shared';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), AuthController.register);
authRoutes.post('/login', authLimiter, validate(loginSchema), AuthController.login);
authRoutes.post('/refresh', validate(refreshTokenSchema), AuthController.refresh);
authRoutes.post('/logout', authenticate, AuthController.logout);
authRoutes.get('/me', authenticate, AuthController.me);
