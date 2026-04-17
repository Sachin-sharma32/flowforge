'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
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
import { api } from '@/lib/api-client';
import { getRecentRoutes } from '@/lib/recent-routes';
import { formatShortcutLabel, matchesShortcut } from '@/lib/preferences';
import { useAppSelector } from '@/stores/hooks';

const DASHBOARD_ROUTES = [
  { label: 'Dashboard', href: '/dashboard', shortcut: 'D' },
  { label: 'Workflows', href: '/workflows', shortcut: 'W' },
  { label: 'Executions', href: '/executions', shortcut: 'E' },
  { label: 'Folders', href: '/folders', shortcut: 'F' },
  { label: 'Templates', href: '/templates', shortcut: 'T' },
  { label: 'Settings', href: '/settings', shortcut: 'S' },
] as const;

const WORKFLOW_DETAIL_ROUTE = /^\/workflows\/([^/]+)$/;
const WORKFLOW_EDIT_ROUTE = /^\/workflows\/([^/]+)\/edit$/;
const EXECUTION_DETAIL_ROUTE = /^\/executions\/([^/]+)$/;
const FOLDER_DETAIL_ROUTE = /^\/folders\/([^/]+)$/;
const WORKSPACE_DETAIL_ROUTE = /^\/workspaces\/([^/]+)$/;

interface ResolvedRecentRoute {
  path: string;
  type: string;
  name: string;
  value: string;
}

const prettifySegment = (segment: string) =>
  segment.replaceAll('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const shortId = (id: string) => `${id.slice(0, 8)}...`;

function resolveRecentRoute(
  path: string,
  workflowNameById: Map<string, string>,
  folderNameById: Map<string, string>,
  executionNameById: Map<string, string>,
  workspaceNameById: Map<string, string>,
  currentWorkspaceName?: string,
): ResolvedRecentRoute {
  const staticRoute = DASHBOARD_ROUTES.find((route) => route.href === path);
  if (staticRoute) {
    return {
      path,
      type: 'Page',
      name: staticRoute.label,
      value: `${staticRoute.label} page ${path}`,
    };
  }

  if (path === '/workflows/new') {
    return {
      path,
      type: 'Workflow',
      name: 'New Workflow',
      value: `workflow new ${path}`,
    };
  }

  const workflowDetailMatch = path.match(WORKFLOW_DETAIL_ROUTE);
  if (workflowDetailMatch) {
    const workflowId = workflowDetailMatch[1];
    const workflowName = workflowNameById.get(workflowId) ?? `Workflow ${shortId(workflowId)}`;
    return {
      path,
      type: 'Workflow',
      name: workflowName,
      value: `workflow ${workflowName} ${path}`,
    };
  }

  const workflowEditMatch = path.match(WORKFLOW_EDIT_ROUTE);
  if (workflowEditMatch) {
    const workflowId = workflowEditMatch[1];
    const workflowName = workflowNameById.get(workflowId) ?? `Workflow ${shortId(workflowId)}`;
    return {
      path,
      type: 'Workflow',
      name: `${workflowName} (Edit)`,
      value: `workflow edit ${workflowName} ${path}`,
    };
  }

  const executionDetailMatch = path.match(EXECUTION_DETAIL_ROUTE);
  if (executionDetailMatch) {
    const executionId = executionDetailMatch[1];
    const executionName =
      executionNameById.get(executionId) ?? `${currentWorkspaceName ?? 'Current Workspace'}`;
    return {
      path,
      type: 'Execution',
      name: executionName,
      value: `execution ${executionName} ${executionId} ${path}`,
    };
  }

  const folderDetailMatch = path.match(FOLDER_DETAIL_ROUTE);
  if (folderDetailMatch) {
    const folderId = folderDetailMatch[1];
    const folderName = folderNameById.get(folderId) ?? `Folder ${shortId(folderId)}`;
    return {
      path,
      type: 'Folder',
      name: folderName,
      value: `folder ${folderName} ${path}`,
    };
  }

  const workspaceDetailMatch = path.match(WORKSPACE_DETAIL_ROUTE);
  if (workspaceDetailMatch) {
    const workspaceId = workspaceDetailMatch[1];
    const workspaceName = workspaceNameById.get(workspaceId) ?? `Workspace ${shortId(workspaceId)}`;
    return {
      path,
      type: 'Workspace',
      name: workspaceName,
      value: `workspace ${workspaceName} ${path}`,
    };
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0) {
    return {
      path,
      type: 'Route',
      name: segments.map(prettifySegment).join(' / '),
      value: `route ${path}`,
    };
  }

  return {
    path,
    type: 'Page',
    name: 'Home',
    value: 'home /',
  };
}

export function DashboardCommandMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const workflows = useAppSelector((state) => state.workflow.workflows);
  const folders = useAppSelector((state) => state.folder.folders);
  const { currentWorkspace, workspaces } = useAppSelector((state) => state.workspace);
  const [open, setOpen] = useState(false);
  const { enabled, shortcut } = useCommandMenuSetting();
  const [recentRoutes, setRecentRoutes] = useState(() => getRecentRoutes());
  const [workflowNamesFromApi, setWorkflowNamesFromApi] = useState<Record<string, string>>({});
  const [folderNamesFromApi, setFolderNamesFromApi] = useState<Record<string, string>>({});
  const [executionNamesFromApi, setExecutionNamesFromApi] = useState<Record<string, string>>({});

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

  const workflowNameById = useMemo(
    () =>
      new Map([
        ...workflows.map((workflow) => [workflow.id, workflow.name] as const),
        ...Object.entries(workflowNamesFromApi),
      ]),
    [workflows, workflowNamesFromApi],
  );

  const folderNameById = useMemo(
    () =>
      new Map([
        ...folders.map((folder) => [folder.id, folder.name] as const),
        ...Object.entries(folderNamesFromApi),
      ]),
    [folders, folderNamesFromApi],
  );

  const executionNameById = useMemo(
    () => new Map(Object.entries(executionNamesFromApi)),
    [executionNamesFromApi],
  );

  const workspaceNameById = useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, workspace.name])),
    [workspaces],
  );

  const workflowIdsInRecent = useMemo(
    () =>
      Array.from(
        new Set(
          recentRoutes
            .map(
              (route) =>
                route.path.match(WORKFLOW_DETAIL_ROUTE) ?? route.path.match(WORKFLOW_EDIT_ROUTE),
            )
            .filter((match): match is RegExpMatchArray => Boolean(match))
            .map((match) => match[1]),
        ),
      ),
    [recentRoutes],
  );

  const folderIdsInRecent = useMemo(
    () =>
      Array.from(
        new Set(
          recentRoutes
            .map((route) => route.path.match(FOLDER_DETAIL_ROUTE))
            .filter((match): match is RegExpMatchArray => Boolean(match))
            .map((match) => match[1]),
        ),
      ),
    [recentRoutes],
  );

  const executionIdsInRecent = useMemo(
    () =>
      Array.from(
        new Set(
          recentRoutes
            .map((route) => route.path.match(EXECUTION_DETAIL_ROUTE))
            .filter((match): match is RegExpMatchArray => Boolean(match))
            .map((match) => match[1]),
        ),
      ),
    [recentRoutes],
  );

  useEffect(() => {
    if (!open || !currentWorkspace?.id) return;
    let cancelled = false;

    const unresolvedWorkflowIds = workflowIdsInRecent.filter((id) => !workflowNameById.has(id));
    const unresolvedFolderIds = folderIdsInRecent.filter((id) => !folderNameById.has(id));
    const unresolvedExecutionIds = executionIdsInRecent.filter((id) => !executionNameById.has(id));

    const resolveNames = async () => {
      if (unresolvedWorkflowIds.length > 0) {
        const workflowResults = await Promise.all(
          unresolvedWorkflowIds.map(async (workflowId) => {
            try {
              const response = await api.get(
                `/workspaces/${currentWorkspace.id}/workflows/${workflowId}`,
              );
              const name = response.data?.data?.name as string | undefined;
              return name ? [workflowId, name] : null;
            } catch {
              return null;
            }
          }),
        );

        const updates = Object.fromEntries(
          workflowResults.filter((entry): entry is [string, string] => Boolean(entry)),
        );

        if (!cancelled && Object.keys(updates).length > 0) {
          setWorkflowNamesFromApi((current) => ({ ...current, ...updates }));
        }
      }

      if (unresolvedFolderIds.length > 0) {
        const folderResults = await Promise.all(
          unresolvedFolderIds.map(async (folderId) => {
            try {
              const response = await api.get(
                `/workspaces/${currentWorkspace.id}/folders/${folderId}`,
              );
              const name = response.data?.data?.name as string | undefined;
              return name ? [folderId, name] : null;
            } catch {
              return null;
            }
          }),
        );

        const updates = Object.fromEntries(
          folderResults.filter((entry): entry is [string, string] => Boolean(entry)),
        );

        if (!cancelled && Object.keys(updates).length > 0) {
          setFolderNamesFromApi((current) => ({ ...current, ...updates }));
        }
      }

      if (unresolvedExecutionIds.length > 0) {
        const executionResults = await Promise.all(
          unresolvedExecutionIds.map(async (executionId) => {
            try {
              const response = await api.get(
                `/workspaces/${currentWorkspace.id}/executions/${executionId}`,
              );
              const execution = response.data?.data as
                | {
                    workflowId?: string | { _id?: string; name?: string };
                  }
                | undefined;

              const workflowRef = execution?.workflowId;

              if (workflowRef && typeof workflowRef === 'object' && workflowRef.name) {
                return [executionId, workflowRef.name] as const;
              }

              if (typeof workflowRef === 'string') {
                const workflowName = workflowNameById.get(workflowRef);
                if (workflowName) {
                  return [executionId, workflowName] as const;
                }
              }

              return null;
            } catch {
              return null;
            }
          }),
        );

        const updates = Object.fromEntries(
          executionResults.filter((entry): entry is [string, string] => Boolean(entry)),
        );

        if (!cancelled && Object.keys(updates).length > 0) {
          setExecutionNamesFromApi((current) => ({ ...current, ...updates }));
        }
      }
    };

    resolveNames();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    currentWorkspace?.id,
    workflowIdsInRecent,
    folderIdsInRecent,
    executionIdsInRecent,
    workflowNameById,
    folderNameById,
    executionNameById,
  ]);

  const recent = useMemo(() => {
    const paths = recentRoutes
      .filter((route) => route.path.startsWith('/'))
      .map((route) => route.path);
    return Array.from(new Set(paths)).map((path) =>
      resolveRecentRoute(
        path,
        workflowNameById,
        folderNameById,
        executionNameById,
        workspaceNameById,
        currentWorkspace?.name,
      ),
    );
  }, [
    recentRoutes,
    workflowNameById,
    folderNameById,
    executionNameById,
    workspaceNameById,
    currentWorkspace?.name,
  ]);
  const shortcutLabel = formatShortcutLabel(shortcut);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="flex flex-col gap-4">
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
        <Command>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {recent.length === 0 ? (
                <CommandItem value="No recent routes" disabled>
                  No recent routes yet
                </CommandItem>
              ) : (
                recent.map((route) => (
                  <CommandItem
                    key={route.path}
                    value={route.value}
                    onSelect={() => navigate(route.path)}
                  >
                    <div className="grid gap-0.5">
                      <span>{route.name}</span>
                      <span className="text-xs text-muted-foreground">{route.path}</span>
                    </div>
                    <CommandShortcut>{route.type}</CommandShortcut>
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
        </Command>
      </CommandDialog>
    </div>
  );
}
