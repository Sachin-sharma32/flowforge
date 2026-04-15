import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-tertiary text-on-tertiary',
        secondary: 'bg-secondary-container text-on-secondary-container',
        destructive: 'bg-destructive/18 text-destructive',
        outline: 'border border-border/20 bg-transparent text-foreground',
        success: 'bg-success/18 text-success',
        warning: 'bg-warning/20 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
