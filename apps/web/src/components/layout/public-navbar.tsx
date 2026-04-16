'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggleButton } from '@/components/theme/theme-toggle-button';
import { cn } from '@/lib/utils';
import Logo from '@/components/ui/logo';

const marketingLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#execution', label: 'Execution' },
] as const;

export function PublicNavbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname.startsWith('/login');
  const isRegister = pathname.startsWith('/register');

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {isHome ? (
            <>
              {marketingLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy & Cookies
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy & Cookies
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          {!isLogin ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
          ) : null}
          {!isRegister ? (
            <Button asChild size="sm" className={cn(isLogin && 'min-w-[7.5rem]')}>
              <Link href="/register">Get Started</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
