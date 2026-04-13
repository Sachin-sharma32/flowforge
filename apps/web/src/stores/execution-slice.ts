import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
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
}

const initialState: ExecutionState = {
  executions: [],
  currentExecution: null,
  stats: null,
  timeline: [],
  workflowStats: [],
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

export const fetchExecutions = createAsyncThunk(
  'execution/fetchExecutions',
  async (
    { workspaceId, params }: { workspaceId: string; params?: Record<string, string> },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions`, { params });
      return { executions: data.data, pagination: data.pagination };
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch executions'));
    }
  },
);

export const fetchExecution = createAsyncThunk(
  'execution/fetchExecution',
  async (
    { workspaceId, executionId }: { workspaceId: string; executionId: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/${executionId}`);
      return data.data as IExecution;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch execution'));
    }
  },
);

export const fetchExecutionStats = createAsyncThunk(
  'execution/fetchStats',
  async ({ workspaceId }: { workspaceId: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/stats`);
      return data.data as IExecutionStats;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch execution stats'));
    }
  },
);

export const fetchExecutionTimeline = createAsyncThunk(
  'execution/fetchTimeline',
  async (
    { workspaceId, days = 14 }: { workspaceId: string; days?: number },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/stats/timeline`, {
        params: { days },
      });
      return data.data as IExecutionTimelinePoint[];
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch execution timeline'));
    }
  },
);

export const fetchWorkflowExecutionStats = createAsyncThunk(
  'execution/fetchWorkflowStats',
  async ({ workspaceId }: { workspaceId: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/executions/stats/by-workflow`);
      return data.data as IWorkflowExecutionStats[];
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch workflow stats'));
    }
  },
);

export const cancelExecution = createAsyncThunk(
  'execution/cancelExecution',
  async (
    { workspaceId, executionId }: { workspaceId: string; executionId: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await api.post(`/workspaces/${workspaceId}/executions/${executionId}/cancel`);
      dispatch(fetchExecution({ workspaceId, executionId }));
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to cancel execution'));
    }
  },
);

const executionSlice = createSlice({
  name: 'execution',
  initialState,
  reducers: {
    clearExecutionError(state) {
      state.error = null;
    },
    onStepUpdate(state, action: PayloadAction<Record<string, unknown>>) {
      const data = action.payload;
      if (!state.currentExecution || state.currentExecution.id !== data.executionId) return;

      const step = state.currentExecution.steps.find((s) => s.stepId === data.stepId);
      if (step) {
        step.status = data.status as any;
        step.output = data.output as Record<string, unknown>;
        step.durationMs = data.durationMs as number;
      }
    },
    onExecutionUpdate(state, action: PayloadAction<Record<string, unknown>>) {
      const data = action.payload;
      if (!state.currentExecution || state.currentExecution.id !== data.executionId) return;

      state.currentExecution.status = data.status as any;
      state.currentExecution.durationMs = data.durationMs as number;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchExecutions
      .addCase(fetchExecutions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecutions.fulfilled, (state, action) => {
        state.executions = action.payload.executions;
        state.pagination = action.payload.pagination;
        state.isLoading = false;
      })
      .addCase(fetchExecutions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // fetchExecution
      .addCase(fetchExecution.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecution.fulfilled, (state, action: PayloadAction<IExecution>) => {
        state.currentExecution = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchExecution.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // fetchStats
      .addCase(fetchExecutionStats.fulfilled, (state, action: PayloadAction<IExecutionStats>) => {
        state.stats = action.payload;
      })
      // fetchTimeline
      .addCase(
        fetchExecutionTimeline.fulfilled,
        (state, action: PayloadAction<IExecutionTimelinePoint[]>) => {
          state.timeline = action.payload;
        },
      )
      // fetchWorkflowStats
      .addCase(
        fetchWorkflowExecutionStats.fulfilled,
        (state, action: PayloadAction<IWorkflowExecutionStats[]>) => {
          state.workflowStats = action.payload;
        },
      );
  },
});

export const { clearExecutionError, onStepUpdate, onExecutionUpdate } = executionSlice.actions;
export const executionReducer = executionSlice.reducer;
