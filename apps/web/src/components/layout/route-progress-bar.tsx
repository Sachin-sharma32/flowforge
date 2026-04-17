'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const START_EVENT = 'flowforge:route-progress:start';
const STOP_EVENT = 'flowforge:route-progress:stop';
const MIN_VISIBLE_MS = 280;
const SAFETY_TIMEOUT_MS = 12000;
const LOADING_TARGET = 84;
const COMPLETE_MS = 220;

export function RouteProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimeoutRef();
    startedAtRef.current = performance.now();
    setActive(true);
    setProgress(6);

    rafRef.current = window.requestAnimationFrame(() => {
      setProgress(LOADING_TARGET);
    });

    timeoutRef.current = window.setTimeout(() => {
      startedAtRef.current = null;
      setProgress(100);
      timeoutRef.current = window.setTimeout(() => {
        setActive(false);
        setProgress(0);
        timeoutRef.current = null;
      }, COMPLETE_MS);
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
      setProgress(100);
      timeoutRef.current = window.setTimeout(() => {
        setActive(false);
        setProgress(0);
        timeoutRef.current = null;
      }, COMPLETE_MS);
    }, remaining);
  }, [clearTimeoutRef]);

  useEffect(() => {
    stop();
  }, [pathname, stop]);

  useEffect(() => {
    const onManualStart = () => start();
    const onManualStop = () => stop();

    window.addEventListener(START_EVENT, onManualStart);
    window.addEventListener(STOP_EVENT, onManualStop);

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

    const onSubmit = (event: SubmitEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (!target.hasAttribute('data-route-progress')) return;
      start();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      window.removeEventListener(START_EVENT, onManualStart);
      window.removeEventListener(STOP_EVENT, onManualStop);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      clearTimeoutRef();
    };
  }, [clearTimeoutRef, start, stop]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[120] h-1 overflow-hidden transition-opacity duration-200',
        active ? 'opacity-100' : 'opacity-0',
      )}
    >
      <Progress
        value={progress}
        className="h-full rounded-none bg-transparent [&_[data-slot=progress-indicator]]:bg-muted"
      />
    </div>
  );
}
