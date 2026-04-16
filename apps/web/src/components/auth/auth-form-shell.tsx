'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

interface AuthFormShellProps {
  badge: string;
  title: string;
  description: string;
  error?: string | null;
  notice?: string | null;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function AuthFormShell({
  badge,
  title,
  description,
  error,
  notice,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  icon: Icon = Sparkles,
  children,
}: AuthFormShellProps) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (notice) {
      toast.info('Notice', {
        description: notice,
      });
    }
  }, [notice]);

  useEffect(() => {
    if (error) {
      toast.error('Something went wrong', {
        description: error,
      });
    }
  }, [error]);

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
      className="relative overflow-hidden rounded-lg border border-border bg-card p-8 shadow-sm sm:p-10"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-muted" />

      <motion.div variants={itemVariants} className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
          <Icon className="h-3.5 w-3.5" />
          {badge}
        </div>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </motion.div>

      <motion.div variants={itemVariants} className="relative z-10 mt-8">
        {children}
      </motion.div>

      <motion.p variants={itemVariants} className="mt-6 text-center text-sm text-muted-foreground">
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
