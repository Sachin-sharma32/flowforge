'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface ThemeToggleButtonProps {
  className?: string;
}

export function ThemeToggleButton({ className }: ThemeToggleButtonProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      aria-pressed={isDark}
      data-testid="theme-toggle"
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-muted-foreground transition-all duration-300 ease-spring hover:scale-105 hover:bg-surface-container-highest hover:text-foreground active:scale-95',
        className,
      )}
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
  );
}
