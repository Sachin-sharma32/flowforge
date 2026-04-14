'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const MIN_VISIBLE_MS = 280;
const SAFETY_TIMEOUT_MS = 12000;

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimeoutRef();
    startedAtRef.current = performance.now();
    setActive(true);

    timeoutRef.current = window.setTimeout(() => {
      startedAtRef.current = null;
      setActive(false);
      timeoutRef.current = null;
    }, SAFETY_TIMEOUT_MS);
  }, [clearTimeoutRef]);

  const stop = useCallback(() => {
    clearTimeoutRef();

    if (startedAtRef.current === null) {
      setActive(false);
      return;
    }

    const elapsed = performance.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    timeoutRef.current = window.setTimeout(() => {
      startedAtRef.current = null;
      setActive(false);
      timeoutRef.current = null;
    }, remaining);
  }, [clearTimeoutRef]);

  useEffect(() => {
    stop();
  }, [pathname, searchParams, stop]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) return;

      const currentPathWithSearch = `${window.location.pathname}${window.location.search}`;
      const nextPathWithSearch = `${nextUrl.pathname}${nextUrl.search}`;

      if (nextPathWithSearch === currentPathWithSearch) return;

      start();
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clearTimeoutRef();
    };
  }, [clearTimeoutRef, start]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[120] h-1 overflow-hidden transition-opacity duration-200',
        active ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="route-progress-bar h-full w-full bg-gradient-to-r from-primary via-info to-primary" />
    </div>
  );
}
