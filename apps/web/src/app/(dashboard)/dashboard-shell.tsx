'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
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
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
