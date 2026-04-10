'use client';

import { useCountUp } from '@/hooks/use-count-up';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  suffix = '',
  prefix = '',
  format,
  className,
}: AnimatedNumberProps) {
  const animated = useCountUp(value, duration);
  const display = format
    ? format(animated)
    : animated.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
