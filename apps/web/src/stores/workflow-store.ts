import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type { IWorkflow, IWorkflowListItem } from '@flowforge/shared';

interface WorkflowState {
  workflows: IWorkflowListItem[];
  currentWorkflow: IWorkflow | null;
  isLoading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };

  fetchWorkflows: (workspaceId: string, params?: Record<string, string>) => Promise<void>;
  fetchWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;
  createWorkflow: (workspaceId: string, data: Record<string, unknown>) => Promise<IWorkflow>;
  updateWorkflow: (
    workspaceId: string,
    workflowId: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  deleteWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;
  duplicateWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;
  activateWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;
  pauseWorkflow: (workspaceId: string, workflowId: string) => Promise<void>;
  executeWorkflow: (
    workspaceId: string,
    workflowId: string,
    payload?: Record<string, unknown>,
  ) => Promise<string>;
  clearError: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  currentWorkflow: null,
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },

  fetchWorkflows: async (workspaceId, params) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/workflows`, { params });
      set({ workflows: data.data, pagination: data.pagination, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch workflows';
      set({ isLoading: false, error: message });
    }
  },

  fetchWorkflow: async (workspaceId, workflowId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/workflows/${workflowId}`);
      set({ currentWorkflow: data.data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch workflow';
      set({ isLoading: false, error: message });
    }
  },

  createWorkflow: async (workspaceId, input) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/workflows`, input);
    get().fetchWorkflows(workspaceId);
    return data.data;
  },

  updateWorkflow: async (workspaceId, workflowId, input) => {
    const { data } = await api.patch(`/workspaces/${workspaceId}/workflows/${workflowId}`, input);
    set({ currentWorkflow: data.data });
  },

  deleteWorkflow: async (workspaceId, workflowId) => {
    await api.delete(`/workspaces/${workspaceId}/workflows/${workflowId}`);
    get().fetchWorkflows(workspaceId);
  },

  duplicateWorkflow: async (workspaceId, workflowId) => {
    await api.post(`/workspaces/${workspaceId}/workflows/${workflowId}/duplicate`);
    get().fetchWorkflows(workspaceId);
  },

  activateWorkflow: async (workspaceId, workflowId) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/workflows/${workflowId}/activate`);
    set({ currentWorkflow: data.data });
    get().fetchWorkflows(workspaceId);
  },

  pauseWorkflow: async (workspaceId, workflowId) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/workflows/${workflowId}/pause`);
    set({ currentWorkflow: data.data });
    get().fetchWorkflows(workspaceId);
  },

  executeWorkflow: async (workspaceId, workflowId, payload) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/workflows/${workflowId}/execute`, {
      payload,
    });
    return data.data.id;
  },

  clearError: () => set({ error: null }),
}));
