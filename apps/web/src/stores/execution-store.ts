import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type { IExecution, IExecutionStats } from '@flowforge/shared';

interface ExecutionState {
  executions: IExecution[];
  currentExecution: IExecution | null;
  stats: IExecutionStats | null;
  isLoading: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };

  fetchExecutions: (workspaceId: string, params?: Record<string, string>) => Promise<void>;
  fetchExecution: (workspaceId: string, executionId: string) => Promise<void>;
  fetchStats: (workspaceId: string) => Promise<void>;
  cancelExecution: (workspaceId: string, executionId: string) => Promise<void>;

  // Real-time updates
  onStepUpdate: (data: Record<string, unknown>) => void;
  onExecutionUpdate: (data: Record<string, unknown>) => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  executions: [],
  currentExecution: null,
  stats: null,
  isLoading: false,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },

  fetchExecutions: async (workspaceId, params) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions`, { params });
      set({ executions: data.data, pagination: data.pagination, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchExecution: async (workspaceId, executionId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/${executionId}`);
      set({ currentExecution: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchStats: async (workspaceId) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/stats`);
      set({ stats: data.data });
    } catch {}
  },

  cancelExecution: async (workspaceId, executionId) => {
    await api.post(`/workspaces/${workspaceId}/executions/${executionId}/cancel`);
    get().fetchExecution(workspaceId, executionId);
  },

  onStepUpdate: (data) => {
    const { currentExecution } = get();
    if (!currentExecution || currentExecution.id !== data.executionId) return;

    const updatedSteps = currentExecution.steps.map((step) =>
      step.stepId === data.stepId
        ? { ...step, status: data.status as string, output: data.output as Record<string, unknown>, durationMs: data.durationMs as number }
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
