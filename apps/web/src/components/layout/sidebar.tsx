'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, GitBranch, PlayCircle, Settings, Zap } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'Executions', href: '/executions', icon: PlayCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-screen w-64 flex-col border-r border-border/50 bg-card/40 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-6">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-glow transition-transform duration-300 hover:scale-105">
          <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight">FlowForge</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item, index) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              style={{ animationDelay: `${index * 60}ms` }}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                'transition-all duration-200 ease-spring stagger-fade-in',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-0.5',
              )}
            >
              {/* Active pill indicator */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary',
                  'transition-all duration-300 ease-spring',
                  isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0',
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
      <div className="border-t border-border/50 p-3">
        <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-accent/40 to-accent/10 p-4 transition-colors duration-300 hover:border-primary/30">
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:bg-primary/20" />
          <p className="label-uppercase text-muted-foreground">Free Plan</p>
          <p className="mt-1 text-sm font-medium">0 / 1,000 runs</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-0 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700" />
          </div>
        </div>
      </div>
    </aside>
  );
}
