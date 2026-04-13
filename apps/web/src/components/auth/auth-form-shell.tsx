'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthFormShellProps {
  badge: string;
  title: string;
  description: string;
  error?: string | null;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  headingFontClassName: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function AuthFormShell({
  badge,
  title,
  description,
  error,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  headingFontClassName,
  icon: Icon = Sparkles,
  children,
}: AuthFormShellProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.05 : 0.45,
        ease: [0.16, 1, 0.3, 1],
        when: 'beforeChildren',
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.05 : 0.35, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="auth-form-card relative overflow-hidden rounded-3xl p-7 sm:p-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/16 to-transparent" />

      <motion.div variants={itemVariants} className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Icon className="h-3.5 w-3.5" />
          {badge}
        </div>

        <h1 className={cn('mt-4 text-3xl font-semibold tracking-tight', headingFontClassName)}>
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </motion.div>

      {error ? (
        <motion.div
          variants={itemVariants}
          className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </motion.div>
      ) : null}

      <motion.div variants={itemVariants} className="relative z-10 mt-6">
        {children}
      </motion.div>

      <motion.p variants={itemVariants} className="mt-5 text-center text-sm text-muted-foreground">
        {footerText}{' '}
        <Link
          href={footerLinkHref}
          className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
        >
          {footerLinkLabel}
        </Link>
      </motion.p>

      <motion.p variants={itemVariants} className="mt-2 text-center text-xs text-muted-foreground">
        We currently use only essential auth/security cookies.{' '}
        <Link
          href="/privacy"
          className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
        >
          Privacy & Cookies
        </Link>
      </motion.p>
    </motion.div>
  );
}
