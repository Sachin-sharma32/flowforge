import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/90 text-primary-foreground shadow-soft',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive dark:bg-destructive/15',
        outline: 'border-border text-foreground',
        success: 'border-success/20 bg-success/10 text-success dark:bg-success/15',
        warning: 'border-warning/30 bg-warning/10 text-warning dark:bg-warning/15',
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
