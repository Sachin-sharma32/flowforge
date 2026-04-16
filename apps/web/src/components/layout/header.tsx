'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logoutUser } from '@/stores/auth-store';
import { LogOut } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme/theme-toggle-button';
import { DashboardCommandMenu } from '@/components/layout/dashboard-command-menu';
import { DashboardBreadcrumbs } from '@/components/layout/dashboard-breadcrumbs';
import { AvatarWithStatus } from '@/components/ui/avatar-with-status';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';

export function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between bg-background px-10">
      <div className="flex min-w-0 items-center gap-3">
        <DashboardCommandMenu />
        <div className="min-w-0">
          <DashboardBreadcrumbs />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggleButton />

        {user && (
          <div className="flex items-center gap-3 rounded-full bg-muted py-1.5 pl-1.5 pr-3 transition-colors duration-300 hover:bg-accent">
            <AvatarWithStatus name={user.name} status="online" className="h-8 w-8" />
            <span className="text-sm font-medium">{user.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-background hover:text-foreground"
              onClick={() => setConfirmLogoutOpen(true)}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <ConfirmActionDialog
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        title="Log out now?"
        description="You can sign back in anytime with the same account."
        confirmLabel="Log out"
        destructive
        onConfirm={handleLogout}
      />
    </header>
  );
}
