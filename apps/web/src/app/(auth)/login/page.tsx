'use client';

import { useState } from 'react';
import { Sora } from 'next/font/google';
import { motion, useReducedMotion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthFormShell } from '@/components/auth/auth-form-shell';
import { login, clearError } from '@/stores/auth-store';

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700'],
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      router.push('/dashboard');
    }
  };

  return (
    <AuthFormShell
      badge="Welcome Back"
      title="Sign in to continue"
      description="Access your workspaces, monitor live executions, and manage automation flows."
      error={error}
      footerText="Don't have an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/register"
      headingFontClassName={sora.className}
      icon={LogIn}
    >
      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.05 : 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.04 }}
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
            required
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.09 }}
          className="space-y-2"
        >
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.14 }}
        >
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </motion.div>
      </motion.form>
    </AuthFormShell>
  );
}
