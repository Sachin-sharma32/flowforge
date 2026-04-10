import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  members: Array<{ userId: string; role: string; joinedAt: string }>;
  settings?: { defaultTimezone?: string; webhookSecret?: string };
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace) => void;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/workspaces');
      const workspaces = data.data;
      set({
        workspaces,
        currentWorkspace: workspaces[0] || null,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch workspaces';
      set({ isLoading: false, error: message });
    }
  },

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  clearError: () => set({ error: null }),
}));
