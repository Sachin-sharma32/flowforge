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
import { formatShortcutLabel, matchesShortcut } from '@/lib/preferences';

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
  const { enabled, shortcut } = useCommandMenuSetting();
  const [recentRoutes, setRecentRoutes] = useState(() => getRecentRoutes());

  useEffect(() => {
    setRecentRoutes(getRecentRoutes());
  }, [pathname, open]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!enabled || !matchesShortcut(event, { ...shortcut, enabled })) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [enabled, shortcut]);

  const recent = useMemo(() => {
    const paths = recentRoutes
      .filter((route) => route.path.startsWith('/'))
      .map((route) => route.path);
    return Array.from(new Set(paths));
  }, [recentRoutes]);
  const shortcutLabel = formatShortcutLabel(shortcut);

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
        <span className="text-[10px] uppercase tracking-normal text-muted-foreground">
          {shortcutLabel}
        </span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Find page or jump to recent route..." />
        <CommandList>
          <CommandEmpty>No matching route found.</CommandEmpty>

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

          <CommandSeparator />

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
        </CommandList>
      </CommandDialog>
    </>
  );
}
