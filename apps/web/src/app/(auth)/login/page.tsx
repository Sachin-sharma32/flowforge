'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthFormShell } from '@/components/auth/auth-form-shell';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  login,
  clearError,
  clearNotice,
  clearOtpState,
  resendVerificationEmail,
} from '@/stores/auth-store';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OtpLoginForm } from '@/components/auth/otp-login-form';

const ROUTE_PROGRESS_START_EVENT = 'flowforge:route-progress:start';
const ROUTE_PROGRESS_STOP_EVENT = 'flowforge:route-progress:stop';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [oauthStatus, setOauthStatus] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, isResendingVerification, error, errorCode, notice, isAuthenticated } =
    useAppSelector((state) => state.auth);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setVerificationStatus(params.get('verification'));
    setOauthStatus(params.get('oauth'));
  }, []);

  const queryNotice =
    verificationStatus === 'success' ? 'Email verified successfully. Sign in to continue.' : null;
  const queryError =
    verificationStatus === 'invalid'
      ? 'Verification link is invalid or expired. Request a new verification email from the sign-up screen.'
      : oauthStatus === 'error'
        ? 'Social sign-in failed. Please try again.'
        : null;
  const resolvedNotice = notice || queryNotice;
  const resolvedError = queryError || error;
  const showVerificationResend =
    !queryError && errorCode === 'EMAIL_UNVERIFIED' && email.trim().length > 0;

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    dispatch(clearError());
    dispatch(clearNotice());
    await dispatch(resendVerificationEmail({ email: email.trim() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event(ROUTE_PROGRESS_START_EVENT));
    dispatch(clearError());
    dispatch(clearNotice());
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      router.push('/dashboard');
      return;
    }
    window.dispatchEvent(new Event(ROUTE_PROGRESS_STOP_EVENT));
  };

  return (
    <AuthFormShell
      badge="Welcome Back"
      title="Sign in to continue"
      description="Access your workspaces, monitor live executions, and manage automation flows."
      error={resolvedError}
      notice={resolvedNotice}
      footerText="Don't have an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/register"
      icon={LogIn}
    >
      <SocialAuthButtons disabled={isLoading} />

      <Tabs
        defaultValue="password"
        onValueChange={() => {
          dispatch(clearError());
          dispatch(clearOtpState());
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="password" className="flex-1">
            Password
          </TabsTrigger>
          <TabsTrigger value="otp" className="flex-1">
            Email Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.3 }}
            onSubmit={handleSubmit}
            data-testid="login-form"
            data-route-progress
            className="space-y-5"
          >
            <Field>
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.04 }}
                className="space-y-2"
              >
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email-input"
                  required
                />
              </motion.div>
            </Field>

            <Field>
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.09 }}
                className="space-y-2"
              >
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                  required
                />
              </motion.div>
            </Field>

            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.14 }}
            >
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="login-submit"
              >
                {isLoading ? (
                  <>
                    <Spinner /> Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </motion.div>

            {showVerificationResend ? (
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.18 }}
              >
                <button
                  type="button"
                  className="inline-flex w-fit text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline disabled:pointer-events-none disabled:opacity-50"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {isResendingVerification ? 'Resending link...' : 'Resend verification email'}
                </button>
              </motion.div>
            ) : null}
          </motion.form>
        </TabsContent>

        <TabsContent value="otp">
          <OtpLoginForm />
        </TabsContent>
      </Tabs>
    </AuthFormShell>
  );
}
