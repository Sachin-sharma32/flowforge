'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import { useCommandMenuSetting } from '@/hooks/use-command-menu-setting';
import { getRecentRoutes } from '@/lib/recent-routes';

const DASHBOARD_ROUTES = [
  { label: 'Dashboard', href: '/dashboard', shortcut: 'D' },
  { label: 'Workflows', href: '/workflows', shortcut: 'W' },
  { label: 'Executions', href: '/executions', shortcut: 'E' },
  { label: 'Folders', href: '/folders', shortcut: 'F' },
  { label: 'Templates', href: '/templates', shortcut: 'T' },
  { label: 'Settings', href: '/settings', shortcut: 'S' },
] as const;

function routeLabel(path: string) {
  const matched = DASHBOARD_ROUTES.find((route) => route.href === path);
  if (matched) return matched.label;
  return (
    path
      .replaceAll('/', ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Home'
  );
}

export function DashboardCommandMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { enabled } = useCommandMenuSetting();
  const [recentRoutes, setRecentRoutes] = useState(() => getRecentRoutes());

  useEffect(() => {
    setRecentRoutes(getRecentRoutes());
  }, [pathname, open]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const isCommandSpace = (event.metaKey || event.ctrlKey) && event.code === 'Space';
      if (!enabled || !isCommandSpace) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [enabled]);

  const recent = useMemo(
    () => recentRoutes.filter((route) => route.path.startsWith('/')).map((route) => route.path),
    [recentRoutes],
  );

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 rounded-full px-3"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          ⌘ Space
        </span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Find page or jump to recent route..." />
        <CommandList>
          <CommandEmpty>No matching route found.</CommandEmpty>

          <CommandGroup heading="Pages">
            {DASHBOARD_ROUTES.map((route) => (
              <CommandItem
                key={route.href}
                value={route.label}
                onSelect={() => navigate(route.href)}
              >
                {route.label}
                <CommandShortcut>{route.shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Recent">
            {recent.length === 0 ? (
              <CommandItem value="No recent routes" disabled>
                No recent routes yet
              </CommandItem>
            ) : (
              recent.map((route) => (
                <CommandItem key={route} value={routeLabel(route)} onSelect={() => navigate(route)}>
                  {routeLabel(route)}
                  <CommandShortcut>{route}</CommandShortcut>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
