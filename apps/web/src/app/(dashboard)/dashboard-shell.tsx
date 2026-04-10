'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PageTransition } from '@/components/ui/page-transition';
import { fetchProfile } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { RootState, AppDispatch } from '@/stores/store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { fetchWorkspaces } = useWorkspaceStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    if (!user) {
      dispatch(fetchProfile());
    }
    fetchWorkspaces();
  }, [dispatch, router, user, fetchWorkspaces]);

  if (!mounted) {
    return (
      <div className="app-background flex h-screen items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-ring rounded-full" />
          <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-background relative flex h-screen overflow-hidden">
      {/* Subtle dot grid texture */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <PageTransition className="mx-auto max-w-7xl">{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
