import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api-client';
import type { IWorkflow, IWorkflowListItem } from '@flowforge/shared';

interface WorkflowState {
  workflows: IWorkflowListItem[];
  currentWorkflow: IWorkflow | null;
  isLoading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const initialState: WorkflowState = {
  workflows: [],
  currentWorkflow: null,
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

export const fetchWorkflows = createAsyncThunk(
  'workflow/fetchWorkflows',
  async (
    { workspaceId, params }: { workspaceId: string; params?: Record<string, string> },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/workflows`, { params });
      return { workflows: data.data, pagination: data.pagination };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch workflows');
    }
  },
);

export const fetchWorkflow = createAsyncThunk(
  'workflow/fetchWorkflow',
  async (
    { workspaceId, workflowId }: { workspaceId: string; workflowId: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/workflows/${workflowId}`);
      return data.data as IWorkflow;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch workflow');
    }
  },
);

export const createWorkflow = createAsyncThunk(
  'workflow/createWorkflow',
  async (
    { workspaceId, input }: { workspaceId: string; input: Record<string, unknown> },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/workflows`, input);
      dispatch(fetchWorkflows({ workspaceId }));
      return data.data as IWorkflow;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to create workflow');
    }
  },
);

export const updateWorkflow = createAsyncThunk(
  'workflow/updateWorkflow',
  async (
    {
      workspaceId,
      workflowId,
      input,
    }: { workspaceId: string; workflowId: string; input: Record<string, unknown> },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.patch(`/workspaces/${workspaceId}/workflows/${workflowId}`, input);
      return data.data as IWorkflow;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update workflow');
    }
  },
);

export const deleteWorkflow = createAsyncThunk(
  'workflow/deleteWorkflow',
  async (
    { workspaceId, workflowId }: { workspaceId: string; workflowId: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/workflows/${workflowId}`);
      dispatch(fetchWorkflows({ workspaceId }));
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to delete workflow');
    }
  },
);

export const duplicateWorkflow = createAsyncThunk(
  'workflow/duplicateWorkflow',
  async (
    { workspaceId, workflowId }: { workspaceId: string; workflowId: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await api.post(`/workspaces/${workspaceId}/workflows/${workflowId}/duplicate`);
      dispatch(fetchWorkflows({ workspaceId }));
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to duplicate workflow');
    }
  },
);

export const activateWorkflow = createAsyncThunk(
  'workflow/activateWorkflow',
  async (
    { workspaceId, workflowId }: { workspaceId: string; workflowId: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/activate`,
      );
      dispatch(fetchWorkflows({ workspaceId }));
      return data.data as IWorkflow;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to activate workflow');
    }
  },
);

export const pauseWorkflow = createAsyncThunk(
  'workflow/pauseWorkflow',
  async (
    { workspaceId, workflowId }: { workspaceId: string; workflowId: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/workflows/${workflowId}/pause`);
      dispatch(fetchWorkflows({ workspaceId }));
      return data.data as IWorkflow;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to pause workflow');
    }
  },
);

export const executeWorkflow = createAsyncThunk(
  'workflow/executeWorkflow',
  async (
    {
      workspaceId,
      workflowId,
      payload,
    }: { workspaceId: string; workflowId: string; payload?: Record<string, unknown> },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/execute`,
        { payload },
      );
      return data.data.id as string;
    } catch (err: any) {
      const apiError = err?.response?.data;
      const context = apiError?.context;
      const contextSuffix =
        context && typeof context.used === 'number' && typeof context.limit === 'number'
          ? ` (${context.used}/${context.limit} used this month)`
          : '';
      return rejectWithValue(
        apiError?.error
          ? `${apiError.error}${contextSuffix}`
          : err.message || 'Failed to execute workflow',
      );
    }
  },
);

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    clearWorkflowError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchWorkflows
      .addCase(fetchWorkflows.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.workflows = action.payload.workflows;
        state.pagination = action.payload.pagination;
        state.isLoading = false;
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // fetchWorkflow
      .addCase(fetchWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflow.fulfilled, (state, action: PayloadAction<IWorkflow>) => {
        state.currentWorkflow = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateWorkflow
      .addCase(updateWorkflow.fulfilled, (state, action: PayloadAction<IWorkflow>) => {
        state.currentWorkflow = action.payload;
      })
      // activateWorkflow
      .addCase(activateWorkflow.fulfilled, (state, action: PayloadAction<IWorkflow>) => {
        state.currentWorkflow = action.payload;
      })
      // pauseWorkflow
      .addCase(pauseWorkflow.fulfilled, (state, action: PayloadAction<IWorkflow>) => {
        state.currentWorkflow = action.payload;
      });
  },
});

export const { clearWorkflowError } = workflowSlice.actions;
export const workflowReducer = workflowSlice.reducer;
