'use client';

import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logout } from '@/stores/auth-store';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark');
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/60 px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
      <div />
      <div className="flex items-center gap-3">
        {/* Theme toggle with cross-fade icon swap */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground backdrop-blur-sm transition-all duration-300 ease-spring hover:scale-105 hover:border-primary/40 hover:text-foreground active:scale-95"
        >
          <Sun
            className={cn(
              'absolute h-4 w-4 transition-all duration-500 ease-spring',
              isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0',
            )}
          />
          <Moon
            className={cn(
              'absolute h-4 w-4 transition-all duration-500 ease-spring',
              isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
            )}
          />
        </button>

        {user && (
          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/60 py-1 pl-1 pr-2 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-soft">
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
