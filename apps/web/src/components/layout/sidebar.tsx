'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  GitBranch,
  PlayCircle,
  Settings,
  Zap,
  LayoutTemplate,
  FolderKanban,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchExecutionStats } from '@/stores/execution-slice';
import { selectCurrentWorkspaceId, selectExecutionStats } from '@/stores/selectors';
import { Progress } from '@/components/ui/progress';
import { TypographySmall, TypographyMuted } from '@/components/ui/typography';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

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
  const dispatch = useAppDispatch();
  const workspaceId = useAppSelector(selectCurrentWorkspaceId);
  const stats = useAppSelector(selectExecutionStats);

  useEffect(() => {
    if (!workspaceId) return;
    dispatch(fetchExecutionStats({ workspaceId }));
  }, [dispatch, workspaceId]);

  const usedRuns = stats?.total ?? 0;
  const monthlyLimit = 1000;
  const usageRatio = Math.min(100, Math.round((usedRuns / monthlyLimit) * 100));

  return (
    <SidebarRoot>
      <SidebarHeader className="px-7 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shadow-sm transition-transform duration-300 hover:scale-105">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight">FlowForge</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="rounded-xl bg-muted p-5 transition-colors duration-300 hover:bg-accent/70">
          <TypographySmall className="font-semibold uppercase tracking-normal">
            Free Plan
          </TypographySmall>
          <TypographyMuted className="mt-1 text-sm font-medium text-foreground">
            {usedRuns.toLocaleString()} / {monthlyLimit.toLocaleString()} runs
          </TypographyMuted>
          <Progress value={usageRatio} className="mt-2 h-1.5" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
}
