'use client';

import { useEffect, useMemo, useState } from 'react';
import { Folder, FolderPlus, MoreVertical, Pin, PinOff, ShieldCheck, Trash2 } from 'lucide-react';
import {
  ViewToggle,
  getStoredViewMode,
  storeViewMode,
  type ViewMode,
} from '@/components/ui/view-toggle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { createFolder, deleteFolder, fetchFolders, updateFolder } from '@/stores/folder-slice';
import { fetchWorkflows, updateWorkflow } from '@/stores/workflow-slice';
import { toast } from 'sonner';
import type { IWorkflowListItem } from '@flowforge/shared';
import { TypographyH1, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { useRouter } from 'next/navigation';

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';

const PINNED_FOLDERS_KEY = 'flowforge.pinned_folders';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
] as const;

const COLOR_OPTIONS = [
  { value: '#60a5fa', label: 'Ocean', icon: '🌊' },
  { value: '#34d399', label: 'Mint', icon: '🌿' },
  { value: '#f59e0b', label: 'Honey', icon: '🍯' },
  { value: '#f87171', label: 'Rose', icon: '🌹' },
  { value: '#a78bfa', label: 'Lavender', icon: '🪻' },
  { value: '#fb7185', label: 'Coral', icon: '🪸' },
] as const;

function readPinnedFolders(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(PINNED_FOLDERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePinnedFolders(folderIds: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PINNED_FOLDERS_KEY, JSON.stringify(folderIds));
}

export default function FoldersPage() {
  const anchor = useComboboxAnchor();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { user } = useAppSelector((state) => state.auth);
  const { folders, isLoading, error } = useAppSelector((state) => state.folder);
  const workflows = useAppSelector((state) => state.workflow.workflows);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<string>(COLOR_OPTIONS[0].value);
  const [pinNewFolder, setPinNewFolder] = useState(false);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);
  const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode('folders'));

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    dispatch(fetchFolders({ workspaceId: currentWorkspace.id }));
    dispatch(fetchWorkflows({ workspaceId: currentWorkspace.id, params: { limit: '200' } }));
  }, [currentWorkspace?.id, dispatch]);

  useEffect(() => {
    setPinnedFolders(readPinnedFolders());
  }, []);

  useEffect(() => {
    if (!error) return;
    toast.error('Folder action failed', {
      description: error,
    });
  }, [error]);

  const currentRole = useMemo(() => {
    if (!user || !currentWorkspace) return 'viewer';
    const role = currentWorkspace.members.find((member) => member.userId === user.id)?.role;
    return (role || 'viewer').toLowerCase();
  }, [currentWorkspace, user]);

  const canManageFolders = currentRole === 'owner' || currentRole === 'admin';

  const workflowCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const workflow of workflows) {
      const key = workflow.folderId || 'uncategorized';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [workflows]);

  const uncategorizedWorkflows = useMemo(
    () => workflows.filter((workflow) => !workflow.folderId),
    [workflows],
  );

  useEffect(() => {
    const validWorkflowIds = new Set(uncategorizedWorkflows.map((workflow) => workflow.id));
    setSelectedWorkflowIds((current) => current.filter((id) => validWorkflowIds.has(id)));
  }, [uncategorizedWorkflows]);

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      const aPinned = pinnedFolders.includes(a.id);
      const bPinned = pinnedFolders.includes(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [folders, pinnedFolders]);

  const togglePinnedFolder = (folderId: string) => {
    setPinnedFolders((current) => {
      const next = current.includes(folderId)
        ? current.filter((id) => id !== folderId)
        : [folderId, ...current];
      writePinnedFolders(next);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    if (!currentWorkspace?.id || !newFolderName.trim()) return;

    const workflowsToAssign = [...selectedWorkflowIds];

    setIsCreating(true);
    try {
      const created = await dispatch(
        createFolder({
          workspaceId: currentWorkspace.id,
          input: {
            name: newFolderName.trim(),
            description: newFolderDescription.trim(),
            color: newFolderColor,
            accessControl: {
              minViewRole: 'viewer',
              minEditRole: 'editor',
              minExecuteRole: 'editor',
            },
          },
        }),
      ).unwrap();

      if (pinNewFolder) {
        const nextPinned = [created.id, ...pinnedFolders.filter((id) => id !== created.id)];
        writePinnedFolders(nextPinned);
        setPinnedFolders(nextPinned);
      }

      if (workflowsToAssign.length > 0) {
        await Promise.all(
          workflowsToAssign.map((workflowId) =>
            dispatch(
              updateWorkflow({
                workspaceId: currentWorkspace.id,
                workflowId,
                input: { folderId: created.id },
              }),
            ).unwrap(),
          ),
        );

        await dispatch(
          fetchWorkflows({ workspaceId: currentWorkspace.id, params: { limit: '200' } }),
        );
      }

      toast.success('Folder created', {
        description:
          workflowsToAssign.length > 0
            ? `${created.name} is ready. Moved ${workflowsToAssign.length} workflow${workflowsToAssign.length > 1 ? 's' : ''}.`
            : `${created.name} is ready.`,
      });

      setNewFolderName('');
      setNewFolderDescription('');
      setNewFolderColor(COLOR_OPTIONS[0].value);
      setPinNewFolder(false);
      setSelectedWorkflowIds([]);
      setIsCreateOpen(false);
    } catch (err) {
      toast.error('Could not create folder', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetAccess = async (
    folderId: string,
    role: (typeof ROLE_OPTIONS)[number]['value'],
  ) => {
    if (!currentWorkspace?.id || !canManageFolders) return;
    try {
      await dispatch(
        updateFolder({
          workspaceId: currentWorkspace.id,
          folderId,
          input: {
            accessControl: {
              minViewRole: role,
              minEditRole: role,
              minExecuteRole: role,
            },
          },
        }),
      ).unwrap();
      toast.success(`Access updated: Folder access is now ${role}.`);
    } catch (err) {
      toast.error('Could not update access', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <TypographyH1>Folders</TypographyH1>
          <TypographyMuted className="mt-1.5">
            Organize workflows by team, product area, or environment. Permissions inherit from
            folder.
          </TypographyMuted>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle
            value={viewMode}
            onChange={(mode) => {
              setViewMode(mode);
              storeViewMode('folders', mode);
            }}
          />
          <Button onClick={() => setIsCreateOpen(true)} disabled={!canManageFolders}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New folder
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Loading folders...
          </CardContent>
        </Card>
      ) : sortedFolders.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <Empty>
              <EmptyMedia>
                <Folder className="h-11 w-11" />
              </EmptyMedia>
              <EmptyTitle>No folders yet</EmptyTitle>
              <EmptyDescription>Create one to organize workflows.</EmptyDescription>
              <EmptyContent>
                <Button onClick={() => setIsCreateOpen(true)} disabled={!canManageFolders}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedFolders.map((folder) => {
            const isPinned = pinnedFolders.includes(folder.id);
            const minRole = folder.accessControl.minViewRole;
            const workflowCount = workflowCounts.get(folder.id) ?? folder.workflowCount ?? 0;
            const memberCount = folder.memberCount ?? 0;

            return (
              <Card
                key={folder.id}
                className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-md"
                onClick={() => router.push(`/workflows?folderId=${folder.id}`)}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${folder.color}33` }}
                      >
                        <Folder className="h-5 w-5" style={{ color: folder.color }} />
                      </div>
                      <div className="min-w-0">
                        <TypographyMuted className="truncate text-sm font-semibold text-foreground">
                          {folder.name}
                        </TypographyMuted>
                        <TypographySmall className="line-clamp-2">
                          {folder.description?.trim()
                            ? folder.description
                            : 'No description provided.'}
                        </TypographySmall>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => togglePinnedFolder(folder.id)}>
                          {isPinned ? (
                            <>
                              <PinOff className="h-4 w-4" /> Unpin folder
                            </>
                          ) : (
                            <>
                              <Pin className="h-4 w-4" /> Pin folder
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>
                          <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Access
                          </span>
                        </DropdownMenuLabel>
                        {ROLE_OPTIONS.map((role) => (
                          <DropdownMenuCheckboxItem
                            key={role.value}
                            checked={minRole === role.value}
                            disabled={!canManageFolders}
                            onCheckedChange={() => handleSetAccess(folder.id, role.value)}
                          >
                            {role.label}
                          </DropdownMenuCheckboxItem>
                        ))}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!canManageFolders}
                          onClick={() => setFolderToDelete({ id: folder.id, name: folder.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                    <span>
                      {workflowCount} {workflowCount === 1 ? 'workflow' : 'workflows'}
                    </span>
                    <span
                      className="inline-block h-1 w-1 rounded-full bg-muted-foreground/60"
                      aria-hidden
                    />
                    <span>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                    {isPinned ? (
                      <>
                        <span
                          className="inline-block h-1 w-1 rounded-full bg-muted-foreground/60"
                          aria-hidden
                        />
                        <span className="inline-flex items-center gap-1">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Workflows</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Pinned</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFolders.map((folder) => {
                const isPinned = pinnedFolders.includes(folder.id);
                const minRole = folder.accessControl.minViewRole;
                const workflowCount = workflowCounts.get(folder.id) ?? folder.workflowCount ?? 0;
                const memberCount = folder.memberCount ?? 0;

                return (
                  <TableRow
                    key={folder.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/workflows?folderId=${folder.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${folder.color}33` }}
                        >
                          <Folder className="h-4 w-4" style={{ color: folder.color }} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium">{folder.name}</span>
                          {folder.description?.trim() ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {folder.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{workflowCount}</TableCell>
                    <TableCell className="tabular-nums">{memberCount}</TableCell>
                    <TableCell>
                      {isPinned ? (
                        <Pin className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => togglePinnedFolder(folder.id)}>
                            {isPinned ? (
                              <>
                                <PinOff className="h-4 w-4" /> Unpin folder
                              </>
                            ) : (
                              <>
                                <Pin className="h-4 w-4" /> Pin folder
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>
                            <span className="inline-flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Access
                            </span>
                          </DropdownMenuLabel>
                          {ROLE_OPTIONS.map((role) => (
                            <DropdownMenuCheckboxItem
                              key={role.value}
                              checked={minRole === role.value}
                              disabled={!canManageFolders}
                              onCheckedChange={() => handleSetAccess(folder.id, role.value)}
                            >
                              {role.label}
                            </DropdownMenuCheckboxItem>
                          ))}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={!canManageFolders}
                            onClick={() => setFolderToDelete({ id: folder.id, name: folder.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete folder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Create a compact folder and optionally assign one uncategorized workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field>
              <FieldLabel>Folder Name</FieldLabel>
              <Input
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="e.g. Sales Ops"
              />
            </Field>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <Input
                value={newFolderDescription}
                onChange={(event) => setNewFolderDescription(event.target.value)}
                placeholder="Pipeline routing, lead enrichment, CRM sync"
                maxLength={500}
              />
            </Field>

            <Field>
              <FieldLabel>Folder Color</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((colorOption) => (
                  <Button
                    key={colorOption.value}
                    onClick={() => setNewFolderColor(colorOption.value)}
                    className={`rounded-full w-9 h-9 ${
                      newFolderColor === colorOption.value
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'ring-1 ring-border/60'
                    }`}
                    aria-label={`Select ${colorOption.label} color`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{colorOption.icon}</AvatarFallback>
                    </Avatar>
                  </Button>
                ))}
              </div>
            </Field>

            <Field>
              <FieldLabel>Move Uncategorized Workflows</FieldLabel>
              <Combobox
                multiple
                autoHighlight
                items={uncategorizedWorkflows}
                itemToStringLabel={(item: IWorkflowListItem) => item.name}
                itemToStringValue={(item: IWorkflowListItem) => item.id}
                isItemEqualToValue={(a: IWorkflowListItem, b: IWorkflowListItem) => a.id === b.id}
                value={uncategorizedWorkflows.filter((w) => selectedWorkflowIds.includes(w.id))}
                onValueChange={(items: IWorkflowListItem[]) =>
                  setSelectedWorkflowIds(items.map((item) => item.id))
                }
              >
                <ComboboxChips ref={anchor} className="w-full">
                  <ComboboxValue>
                    {(values: IWorkflowListItem[]) => (
                      <>
                        {values.map((value) => (
                          <ComboboxChip key={value.id}>{value.name}</ComboboxChip>
                        ))}
                        <ComboboxChipsInput
                          placeholder={
                            uncategorizedWorkflows.length > 0
                              ? 'Search workflows...'
                              : 'No uncategorized workflows'
                          }
                        />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>

                <ComboboxContent anchor={anchor}>
                  <ComboboxEmpty>No items found.</ComboboxEmpty>
                  <ComboboxList>
                    {(item: IWorkflowListItem) => (
                      <ComboboxItem key={item.id} value={item}>
                        {item.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>

            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <div>
                <TypographyMuted className="text-sm font-medium text-foreground">
                  Pin this folder
                </TypographyMuted>
                <TypographySmall>Pinned folders appear first in the list.</TypographySmall>
              </div>
              <Switch checked={pinNewFolder} onCheckedChange={setPinNewFolder} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!canManageFolders || isCreating || !newFolderName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(folderToDelete)}
        onOpenChange={(open) => {
          if (!open) setFolderToDelete(null);
        }}
        title="Delete folder?"
        description={
          folderToDelete
            ? `This will permanently delete "${folderToDelete.name}". Workflows inside it will become uncategorized.`
            : ''
        }
        confirmLabel="Delete folder"
        destructive
        onConfirm={async () => {
          if (!currentWorkspace?.id || !folderToDelete) return;
          try {
            await dispatch(
              deleteFolder({ workspaceId: currentWorkspace.id, folderId: folderToDelete.id }),
            ).unwrap();
            setPinnedFolders((current) => {
              const next = current.filter((id) => id !== folderToDelete.id);
              writePinnedFolders(next);
              return next;
            });
            toast.success('Folder deleted', {
              description: `${folderToDelete.name} was deleted.`,
            });
          } catch (err) {
            toast.error('Failed to delete folder', {
              description: err instanceof Error ? err.message : 'Please try again.',
            });
          } finally {
            setFolderToDelete(null);
          }
        }}
      />
    </div>
  );
}
