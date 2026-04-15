'use client';

import { useEffect, useMemo, useState } from 'react';
import { Folder, FolderPlus, MoreHorizontal, Pin, PinOff, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';

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
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { user } = useAppSelector((state) => state.auth);
  const { folders, isLoading, error } = useAppSelector((state) => state.folder);
  const workflows = useAppSelector((state) => state.workflow.workflows);
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<string>(COLOR_OPTIONS[0].value);
  const [pinNewFolder, setPinNewFolder] = useState(false);
  const [newFolderWorkflowId, setNewFolderWorkflowId] = useState('none');
  const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);

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
    toast({
      variant: 'destructive',
      title: 'Folder action failed',
      description: error,
    });
  }, [error, toast]);

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

    setIsCreating(true);
    try {
      const created = await dispatch(
        createFolder({
          workspaceId: currentWorkspace.id,
          input: {
            name: newFolderName.trim(),
            description: '',
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

      if (newFolderWorkflowId !== 'none') {
        await dispatch(
          updateWorkflow({
            workspaceId: currentWorkspace.id,
            workflowId: newFolderWorkflowId,
            input: { folderId: created.id },
          }),
        ).unwrap();
      }

      toast({
        variant: 'success',
        title: 'Folder created',
        description: `${created.name} is ready.`,
      });

      setNewFolderName('');
      setNewFolderColor(COLOR_OPTIONS[0].value);
      setPinNewFolder(false);
      setNewFolderWorkflowId('none');
      setIsCreateOpen(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not create folder',
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
      toast({
        variant: 'success',
        title: 'Access updated',
        description: `Folder access is now ${role}.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not update access',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Folders</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Organize workflows with cleaner folder-level permissions.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} disabled={!canManageFolders}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Loading folders...
          </CardContent>
        </Card>
      ) : sortedFolders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No folders yet. Create one to organize workflows.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedFolders.map((folder) => {
            const isPinned = pinnedFolders.includes(folder.id);
            const minRole = folder.accessControl.minViewRole;

            return (
              <Card key={folder.id} className="overflow-visible">
                <CardContent className="relative space-y-4 p-4">
                  <div
                    className="absolute left-4 top-0 h-3 w-16 -translate-y-1/2 rounded-t-lg border border-border/50 border-b-0"
                    style={{ backgroundColor: `${folder.color}22` }}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${folder.color}33` }}
                      >
                        <Folder className="h-5 w-5" style={{ color: folder.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {workflowCounts.get(folder.id) || folder.workflowCount || 0} workflows
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          disabled={!canManageFolders}
                          onClick={() => setFolderToDelete({ id: folder.id, name: folder.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-surface-container-high px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Minimum role</span>
                    <span className="font-medium capitalize">{minRole}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Folder Name</label>
              <Input
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="e.g. Sales Ops"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Folder Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setNewFolderColor(colorOption.value)}
                    className={`rounded-full p-0.5 transition ${
                      newFolderColor === colorOption.value
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'ring-1 ring-border/60'
                    }`}
                    aria-label={`Select ${colorOption.label} color`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback
                        style={{
                          backgroundColor: `${colorOption.value}33`,
                          color: colorOption.value,
                        }}
                      >
                        {colorOption.icon}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Move Uncategorized Workflow</label>
              <Select value={newFolderWorkflowId} onValueChange={setNewFolderWorkflowId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Do not move any workflow</SelectItem>
                  {uncategorizedWorkflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md bg-surface-container-high px-3 py-2">
              <div>
                <p className="text-sm font-medium">Pin this folder</p>
                <p className="text-xs text-muted-foreground">
                  Pinned folders appear first in the list.
                </p>
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
            toast({
              variant: 'success',
              title: 'Folder deleted',
              description: `${folderToDelete.name} was deleted.`,
            });
          } catch (err) {
            toast({
              variant: 'destructive',
              title: 'Failed to delete folder',
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
