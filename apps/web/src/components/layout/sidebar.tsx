'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  GitBranch,
  PlayCircle,
  Settings,
  Zap,
  LayoutTemplate,
  FolderKanban,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate },
  { name: 'Folders', href: '/folders', icon: FolderKanban },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'Executions', href: '/executions', icon: PlayCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-screen w-[272px] flex-col bg-surface-container-low shadow-soft-lg">
      {/* Brand */}
      <div className="flex h-[72px] items-center gap-3 px-7">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-primary to-primary-container shadow-soft transition-transform duration-300 hover:scale-105">
          <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight">FlowForge</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item, index) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              style={{ animationDelay: `${index * 60}ms` }}
              className={cn(
                'group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium',
                'transition-all duration-200 ease-spring stagger-fade-in',
                isActive
                  ? 'bg-surface-container-high text-foreground'
                  : 'text-muted-foreground hover:bg-surface-bright hover:text-foreground hover:translate-x-0.5',
              )}
            >
              {/* Active pill indicator */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary',
                  'transition-all duration-300 ease-spring',
                  isActive ? 'scale-y-100 opacity-80' : 'scale-y-0 opacity-0',
                )}
              />
              <item.icon
                className={cn(
                  'h-4 w-4 transition-transform duration-200 ease-spring group-hover:scale-110',
                  isActive && 'text-primary',
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Plan card */}
      <div className="p-4">
        <div className="group relative overflow-hidden rounded-xl bg-surface-container-high p-5 transition-colors duration-300 hover:bg-surface-container-highest/70">
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20" />
          <p className="label-uppercase text-muted-foreground">Free Plan</p>
          <p className="mt-1 text-sm font-medium">0 / 1,000 runs</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
            <div className="h-full w-0 rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-700" />
          </div>
        </div>
      </div>
    </aside>
  );
}
