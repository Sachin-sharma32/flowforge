'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UserRoundPlus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthFormShell } from '@/components/auth/auth-form-shell';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import {
  register,
  clearError,
  clearNotice,
  clearPendingVerification,
  resendVerificationEmail,
} from '@/stores/auth-store';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, isResendingVerification, error, notice, pendingVerificationEmail } =
    useAppSelector((state) => state.auth);
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(clearNotice());
    await dispatch(register({ name, email, password }));
  };

  const handleResend = async () => {
    if (!pendingVerificationEmail) return;
    dispatch(clearError());
    await dispatch(resendVerificationEmail({ email: pendingVerificationEmail }));
  };

  return (
    <AuthFormShell
      badge="New Workspace"
      title="Create your account"
      description="Start building resilient workflows with live observability and team-ready controls."
      error={error}
      notice={notice}
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkHref="/login"
      icon={UserRoundPlus}
    >
      {pendingVerificationEmail ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.25 }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            We sent a verification email to{' '}
            <span className="font-medium">{pendingVerificationEmail}</span>. Open the link in that
            email to activate your account.
          </p>

          <button
            type="button"
            className="inline-flex w-fit text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline disabled:pointer-events-none disabled:opacity-50"
            onClick={handleResend}
            disabled={isResendingVerification}
          >
            {isResendingVerification ? 'Resending link...' : 'Resend verification email'}
          </button>

          <Button type="button" className="w-full" onClick={() => router.push('/login')}>
            I already verified, continue to sign in
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              dispatch(clearPendingVerification());
              setName('');
              setEmail('');
              setPassword('');
            }}
          >
            Use a different email
          </Button>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.3 }}
          onSubmit={handleSubmit}
          data-testid="register-form"
          className="space-y-5"
        >
          <SocialAuthButtons disabled={isLoading} />

          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.04 }}
            className="space-y-2"
          >
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="register-name-input"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.09 }}
            className="space-y-2"
          >
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="register-email-input"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.14 }}
            className="space-y-2"
          >
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="register-password-input"
              required
              minLength={8}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.19 }}
          >
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="register-submit"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </motion.div>
        </motion.form>
      )}
    </AuthFormShell>
  );
}
