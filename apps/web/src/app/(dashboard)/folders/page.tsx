'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderPlus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { createFolder, deleteFolder, fetchFolders, updateFolder } from '@/stores/folder-slice';
import { fetchWorkflows } from '@/stores/workflow-slice';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
] as const;

export default function FoldersPage() {
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { user } = useAppSelector((state) => state.auth);
  const { folders, isLoading, error } = useAppSelector((state) => state.folder);
  const workflows = useAppSelector((state) => state.workflow.workflows);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    dispatch(fetchFolders({ workspaceId: currentWorkspace.id }));
    dispatch(fetchWorkflows({ workspaceId: currentWorkspace.id, params: { limit: '200' } }));
  }, [currentWorkspace?.id, dispatch]);

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

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(
      (folder) =>
        folder.name.toLowerCase().includes(q) ||
        folder.description.toLowerCase().includes(q) ||
        folder.slug.toLowerCase().includes(q),
    );
  }, [folders, search]);

  const handleCreate = async () => {
    if (!currentWorkspace?.id || !name.trim()) return;

    setIsCreating(true);
    try {
      await dispatch(
        createFolder({
          workspaceId: currentWorkspace.id,
          input: {
            name: name.trim(),
            description,
            color,
            accessControl: {
              minViewRole: 'viewer',
              minEditRole: 'editor',
              minExecuteRole: 'editor',
            },
          },
        }),
      ).unwrap();

      setName('');
      setDescription('');
      setColor('#3b82f6');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAccessChange = async (
    folderId: string,
    accessControl: {
      minViewRole: string;
      minEditRole: string;
      minExecuteRole: string;
    },
  ) => {
    if (!currentWorkspace?.id || !canManageFolders) return;
    await dispatch(
      updateFolder({
        workspaceId: currentWorkspace.id,
        folderId,
        input: { accessControl },
      }),
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Folders
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Organize workflows by domain and apply folder-level access controls.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Folder</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1.2fr_1.4fr_120px_auto]">
          <Input
            placeholder="Folder name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!canManageFolders}
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!canManageFolders}
          />
          <Input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            disabled={!canManageFolders}
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canManageFolders || isCreating || !name.trim()}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            {isCreating ? 'Creating...' : 'Add Folder'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search folders by name, slug, or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Loading folders...
          </CardContent>
        </Card>
      ) : filteredFolders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No folders found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredFolders.map((folder) => (
            <Card key={folder.id} className="overflow-hidden">
              <div className="h-1.5 w-full" style={{ backgroundColor: folder.color }} />
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{folder.name}</h3>
                    <p className="text-xs text-muted-foreground">/{folder.slug}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {folder.description || 'No description'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{workflowCounts.get(folder.id) || folder.workflowCount || 0} workflows</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Access Control
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { key: 'minViewRole', label: 'View' },
                      { key: 'minEditRole', label: 'Edit' },
                      { key: 'minExecuteRole', label: 'Execute' },
                    ].map((item) => (
                      <div key={item.key} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <select
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                          disabled={!canManageFolders}
                          value={
                            folder.accessControl[item.key as keyof typeof folder.accessControl]
                          }
                          onChange={(event) =>
                            handleAccessChange(folder.id, {
                              ...folder.accessControl,
                              [item.key]: event.target.value,
                            })
                          }
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={!canManageFolders}
                    onClick={() => {
                      if (!currentWorkspace?.id) return;
                      dispatch(
                        deleteFolder({ workspaceId: currentWorkspace.id, folderId: folder.id }),
                      );
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Folder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
