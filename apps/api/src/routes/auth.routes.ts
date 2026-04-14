import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireCsrfToken } from '../middleware/csrf.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  googleOneTapSchema,
} from '@flowforge/shared';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), AuthController.register);
authRoutes.get('/verify-email', authLimiter, AuthController.verifyEmailFromLink);
authRoutes.post(
  '/verify-email',
  authLimiter,
  validate(verifyEmailSchema),
  AuthController.verifyEmail,
);
authRoutes.post(
  '/resend-verification',
  authLimiter,
  validate(resendVerificationSchema),
  AuthController.resendVerification,
);
authRoutes.post(
  '/oauth/google/one-tap',
  authLimiter,
  validate(googleOneTapSchema),
  AuthController.googleOneTap,
);
authRoutes.get('/oauth/:provider/start', authLimiter, AuthController.oauthStart);
authRoutes.get('/oauth/:provider/callback', authLimiter, AuthController.oauthCallback);
authRoutes.post('/login', authLimiter, validate(loginSchema), AuthController.login);
authRoutes.post('/refresh', authLimiter, requireCsrfToken, AuthController.refresh);
authRoutes.post('/logout', requireCsrfToken, AuthController.logout);
authRoutes.post('/logout-all', authenticate, AuthController.logoutAll);
authRoutes.get('/me', authenticate, AuthController.me);
