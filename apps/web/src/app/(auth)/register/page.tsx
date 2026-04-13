'use client';

import { useState } from 'react';
import { Sora } from 'next/font/google';
import { motion, useReducedMotion } from 'framer-motion';
import { UserRoundPlus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthFormShell } from '@/components/auth/auth-form-shell';
import { register, clearError } from '@/stores/auth-store';

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700'],
});

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(register({ name, email, password }));
    if (register.fulfilled.match(result)) {
      router.push('/dashboard');
    }
  };

  return (
    <AuthFormShell
      badge="New Workspace"
      title="Create your account"
      description="Start building resilient workflows with live observability and team-ready controls."
      error={error}
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkHref="/login"
      headingFontClassName={sora.className}
      icon={UserRoundPlus}
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
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            required
            minLength={8}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.3, delay: 0.19 }}
        >
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </motion.div>
      </motion.form>
    </AuthFormShell>
  );
}
