'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  return (
    <div key={pathname} className={cn('animate-in fade-in-0 duration-200', className)}>
      {children}
    </div>
  );
}
