import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium',
    'ring-offset-background transition-all duration-200 ease-spring',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-b from-primary to-primary-container text-primary-foreground',
          'shadow-soft hover:brightness-95',
        ].join(' '),
        destructive: [
          'bg-destructive text-destructive-foreground',
          'shadow-soft hover:brightness-95',
        ].join(' '),
        outline: [
          'border border-border/20 bg-surface-container-high text-foreground',
          'hover:bg-surface-bright',
        ].join(' '),
        secondary: [
          'bg-secondary-container text-on-secondary-container',
          'hover:bg-secondary-container/80',
        ].join(' '),
        ghost: 'hover:bg-surface-container-high hover:text-foreground',
        link: 'h-auto px-0 py-0 text-primary underline-offset-4 hover:text-primary/80 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2.5 text-sm',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-12 px-8 text-base',
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
