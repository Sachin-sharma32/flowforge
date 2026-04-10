import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from its previous value (or 0 on mount) up to `target`
 * over `duration` ms using requestAnimationFrame and ease-out cubic.
 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) {
      setValue(to);
      return;
    }

    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (to - from) * eased;
      setValue(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
