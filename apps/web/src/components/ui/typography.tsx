import * as React from 'react';
import { cn } from '@/lib/utils';

function TypographyH1({ className, ...props }: React.ComponentProps<'h1'>) {
  return <h1 className={cn('text-4xl font-bold tracking-tight', className)} {...props} />;
}

function TypographyH2({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-2xl font-semibold tracking-tight', className)} {...props} />;
}

function TypographyH3({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-lg font-semibold tracking-tight', className)} {...props} />;
}

function TypographyMuted({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function TypographySmall({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />;
}

export { TypographyH1, TypographyH2, TypographyH3, TypographyMuted, TypographySmall };
