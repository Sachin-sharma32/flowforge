'use client';

import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logout } from '@/stores/auth-store';
import type { RootState, AppDispatch } from '@/stores/store';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
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
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{user.name}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
