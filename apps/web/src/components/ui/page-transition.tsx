'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content in a fade + slide-up animation.
 * Re-keys on pathname change so the animation replays between routes.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  return (
    <div key={pathname} className={cn('animate-fade-in-up', className)}>
      {children}
    </div>
  );
}
