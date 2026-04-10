import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type {
  IExecution,
  IExecutionStats,
  IExecutionTimelinePoint,
  IWorkflowExecutionStats,
} from '@flowforge/shared';

interface ExecutionState {
  executions: IExecution[];
  currentExecution: IExecution | null;
  stats: IExecutionStats | null;
  timeline: IExecutionTimelinePoint[];
  workflowStats: IWorkflowExecutionStats[];
  isLoading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };

  fetchExecutions: (workspaceId: string, params?: Record<string, string>) => Promise<void>;
  fetchExecution: (workspaceId: string, executionId: string) => Promise<void>;
  fetchStats: (workspaceId: string) => Promise<void>;
  fetchTimeline: (workspaceId: string, days?: number) => Promise<void>;
  fetchWorkflowStats: (workspaceId: string) => Promise<void>;
  cancelExecution: (workspaceId: string, executionId: string) => Promise<void>;
  clearError: () => void;

  // Real-time updates
  onStepUpdate: (data: Record<string, unknown>) => void;
  onExecutionUpdate: (data: Record<string, unknown>) => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  executions: [],
  currentExecution: null,
  stats: null,
  timeline: [],
  workflowStats: [],
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },

  fetchExecutions: async (workspaceId, params) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions`, { params });
      set({ executions: data.data, pagination: data.pagination, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch executions';
      set({ isLoading: false, error: message });
    }
  },

  fetchExecution: async (workspaceId, executionId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/${executionId}`);
      set({ currentExecution: data.data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch execution';
      set({ isLoading: false, error: message });
    }
  },

  fetchStats: async (workspaceId) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/stats`);
      set({ stats: data.data });
    } catch (err) {
      console.error('Failed to fetch execution stats:', err);
    }
  },

  fetchTimeline: async (workspaceId, days = 14) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/stats/timeline`, {
        params: { days },
      });
      set({ timeline: data.data });
    } catch {}
  },

  fetchWorkflowStats: async (workspaceId) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/stats/by-workflow`);
      set({ workflowStats: data.data });
    } catch {}
  },

  cancelExecution: async (workspaceId, executionId) => {
    await api.post(`/workspaces/${workspaceId}/executions/${executionId}/cancel`);
    get().fetchExecution(workspaceId, executionId);
  },

  clearError: () => set({ error: null }),

  onStepUpdate: (data) => {
    const { currentExecution } = get();
    if (!currentExecution || currentExecution.id !== data.executionId) return;

    const updatedSteps = currentExecution.steps.map((step) =>
      step.stepId === data.stepId
        ? {
            ...step,
            status: data.status as string,
            output: data.output as Record<string, unknown>,
            durationMs: data.durationMs as number,
          }
        : step,
    );

    set({
      currentExecution: { ...currentExecution, steps: updatedSteps } as IExecution,
    });
  },

  onExecutionUpdate: (data) => {
    const { currentExecution } = get();
    if (!currentExecution || currentExecution.id !== data.executionId) return;

    set({
      currentExecution: {
        ...currentExecution,
        status: data.status as string,
        durationMs: data.durationMs as number,
      } as IExecution,
    });
  },
}));
