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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/60 px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
      <div />
      <div className="flex items-center gap-3">
        <ThemeToggleButton />

        {user && (
          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/60 py-1 pl-1 pr-2 backdrop-blur-sm transition-colors duration-300 hover:border-primary/30">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground shadow-glow">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{user.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
