'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PageTransition } from '@/components/ui/page-transition';
import { fetchProfile } from '@/stores/auth-store';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { cn } from '@/lib/utils';
import { pushRecentRoute } from '@/lib/recent-routes';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const [mounted, setMounted] = useState(false);
  const isWorkflowBuilderRoute =
    pathname === '/workflows/new' || /^\/workflows\/[^/]+\/edit$/.test(pathname);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setMounted(true);

      if (!user) {
        const profileResult = await dispatch(fetchProfile());
        if (!cancelled && fetchProfile.rejected.match(profileResult)) {
          router.push('/login');
          return;
        }
      }

      if (!cancelled) {
        dispatch(fetchWorkspaces());
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [dispatch, router, user]);

  useEffect(() => {
    if (!pathname || pathname === '/') return;
    pushRecentRoute(pathname);
  }, [pathname]);

  if (!mounted) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full" />
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" />
        </div>
      </div>
    );
  }

  if (isWorkflowBuilderRoute) {
    return (
      <div className="bg-background relative h-screen w-screen overflow-hidden">
        <main className="relative h-full w-full overflow-hidden">
          <PageTransition className="h-full">{children}</PageTransition>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background relative flex h-screen overflow-hidden">
      {/* Subtle dot grid texture */}
      <div className="hidden pointer-events-none absolute inset-0 opacity-40" />
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className={cn('flex-1 overflow-y-auto px-10 py-10')}>
          <PageTransition className={cn('mx-auto max-w-[1800px] 2xl:max-w-full 2xl:px-12')}>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
