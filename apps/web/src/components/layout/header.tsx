'use client';

import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logoutUser } from '@/stores/auth-store';
import { LogOut } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme/theme-toggle-button';

export function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between bg-surface/75 px-10 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/65">
      <div />
      <div className="flex items-center gap-4">
        <ThemeToggleButton />

        {user && (
          <div className="flex items-center gap-3 rounded-full bg-surface-container-high py-1.5 pl-1.5 pr-3 transition-colors duration-300 hover:bg-surface-container-highest">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-primary to-primary-container text-sm font-bold text-primary-foreground shadow-soft">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{user.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-surface hover:text-foreground"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
