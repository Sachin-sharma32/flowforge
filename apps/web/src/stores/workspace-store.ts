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

  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/workspaces');
      const workspaces = data.data;
      set({
        workspaces,
        currentWorkspace: workspaces[0] || null,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
}));
