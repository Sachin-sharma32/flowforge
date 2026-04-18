import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Verification token is required'),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: z.string().email('Invalid email address'),
  })
  .strict();

export const googleOneTapSchema = z
  .object({
    credential: z.string().min(1, 'Google credential is required'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email('Invalid email address'),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })
  .strict();

export const requestOtpSchema = z
  .object({
    email: z.string().email('Invalid email address'),
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    otp: z
      .string()
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d{6}$/, 'OTP must be 6 digits'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type GoogleOneTapInput = z.infer<typeof googleOneTapSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
