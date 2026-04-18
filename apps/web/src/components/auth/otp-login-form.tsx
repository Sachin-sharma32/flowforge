'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { requestOtp, verifyOtp, clearError, clearOtpState } from '@/stores/auth-store';
import { Spinner } from '@/components/ui/spinner';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';

const ROUTE_PROGRESS_START_EVENT = 'flowforge:route-progress:start';
const ROUTE_PROGRESS_STOP_EVENT = 'flowforge:route-progress:stop';

export function OtpLoginForm() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, isOtpSending, otpSentTo } = useAppSelector((state) => state.auth);
  const shouldReduceMotion = useReducedMotion();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    await dispatch(requestOtp({ email }));
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !otpSentTo) return;
    window.dispatchEvent(new Event(ROUTE_PROGRESS_START_EVENT));
    dispatch(clearError());
    const result = await dispatch(verifyOtp({ email: otpSentTo, otp }));
    if (verifyOtp.fulfilled.match(result)) {
      router.push('/dashboard');
      return;
    }
    window.dispatchEvent(new Event(ROUTE_PROGRESS_STOP_EVENT));
  };

  const handleBack = () => {
    dispatch(clearOtpState());
    dispatch(clearError());
    setOtp('');
  };

  if (!otpSentTo) {
    return (
      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.05 : 0.3 }}
        onSubmit={handleRequestOtp}
        className="space-y-5"
      >
        <Field>
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.04 }}
            className="space-y-2"
          >
            <FieldLabel htmlFor="otp-email">Email</FieldLabel>
            <Input
              id="otp-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </motion.div>
        </Field>

        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.09 }}
        >
          <Button type="submit" className="w-full" disabled={isOtpSending}>
            {isOtpSending ? (
              <>
                <Spinner /> Sending code...
              </>
            ) : (
              'Send sign-in code'
            )}
          </Button>
        </motion.div>
      </motion.form>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0.05 : 0.3 }}
      onSubmit={handleVerifyOtp}
      className="space-y-5"
    >
      <p className="text-sm text-muted-foreground text-center">
        We sent a 6-digit code to <strong>{otpSentTo}</strong>
      </p>

      <Field>
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.04 }}
          className="flex justify-center"
        >
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </motion.div>
      </Field>

      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.09 }}
        className="space-y-2"
      >
        <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
          {isLoading ? (
            <>
              <Spinner /> Verifying...
            </>
          ) : (
            'Verify & sign in'
          )}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={handleBack}>
          Use a different email
        </Button>
      </motion.div>
    </motion.form>
  );
}
