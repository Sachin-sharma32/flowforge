import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium',
    'ring-offset-background transition-colors duration-200 ease-spring',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-br from-primary to-primary/85 text-primary-foreground',
          'shadow-soft hover:from-primary/95 hover:to-primary/78 hover:ring-1 hover:ring-primary-foreground/10',
        ].join(' '),
        destructive: [
          'bg-gradient-to-br from-destructive to-destructive/85 text-destructive-foreground',
          'shadow-soft hover:from-destructive/95 hover:to-destructive/78 hover:ring-1 hover:ring-destructive-foreground/10',
        ].join(' '),
        outline: [
          'border border-border bg-background/60 backdrop-blur-sm',
          'hover:border-primary/30 hover:bg-accent/80 hover:text-accent-foreground',
        ].join(' '),
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80 hover:ring-1 hover:ring-border/80',
        ].join(' '),
        ghost: 'hover:bg-accent/80 hover:text-accent-foreground',
        link: 'h-auto px-0 py-0 text-primary underline-offset-4 hover:text-primary/80 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-lg px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
