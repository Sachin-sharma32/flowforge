import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { IWorkflow, IWorkflowListItem } from '@flowforge/shared';

interface WorkflowState {
  workflows: IWorkflowListItem[];
  templates: IWorkflowListItem[];
  currentWorkflow: IWorkflow | null;
  isLoading: boolean;
  isLoadingTemplates: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

type WorkflowPagination = WorkflowState['pagination'];
type WorkflowListArgs = { workspaceId: string; params?: Record<string, string> };
type WorkflowArgs = { workspaceId: string; workflowId: string };
type WorkflowMutationArgs = WorkflowArgs & { input: Record<string, unknown> };
type WorkflowExecutionArgs = WorkflowArgs & { payload?: Record<string, unknown> };
type WorkflowTemplateArgs = { workspaceId: string; templateId: string };
type WorkflowListResponse = {
  workflows: IWorkflowListItem[];
  pagination: WorkflowPagination;
};
type WorkflowExecutionError = {
  response?: {
    data?: {
      context?: { used?: number; limit?: number };
    };
  };
};

const initialState: WorkflowState = {
  workflows: [],
  templates: [],
  currentWorkflow: null,
  isLoading: false,
  isLoadingTemplates: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const createWorkflowAsyncThunk = createAsyncThunk.withTypes<{ rejectValue: string }>();

const getWorkflowsPath = (workspaceId: string) => `/workspaces/${workspaceId}/workflows`;
const getWorkflowPath = (workspaceId: string, workflowId: string) =>
  `${getWorkflowsPath(workspaceId)}/${workflowId}`;
const getWorkflowTemplatesPath = (workspaceId: string) =>
  `${getWorkflowsPath(workspaceId)}/templates`;

const setWorkflowError = (state: WorkflowState, error?: string) => {
  state.error = error ?? null;
};

export const fetchWorkflows = createWorkflowAsyncThunk<WorkflowListResponse, WorkflowListArgs>(
  'workflow/fetchWorkflows',
  async ({ workspaceId, params }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(getWorkflowsPath(workspaceId), { params });
      return {
        workflows: data.data as IWorkflowListItem[],
        pagination: data.pagination as WorkflowPagination,
      };
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch workflows'));
    }
  },
);

export const fetchWorkflow = createWorkflowAsyncThunk<IWorkflow, WorkflowArgs>(
  'workflow/fetchWorkflow',
  async ({ workspaceId, workflowId }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(getWorkflowPath(workspaceId, workflowId));
      return data.data as IWorkflow;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch workflow'));
    }
  },
);

export const createWorkflow = createWorkflowAsyncThunk<
  IWorkflow,
  { workspaceId: string; input: Record<string, unknown> }
>('workflow/createWorkflow', async ({ workspaceId, input }, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.post(getWorkflowsPath(workspaceId), input);
    dispatch(fetchWorkflows({ workspaceId }));
    return data.data as IWorkflow;
  } catch (err: unknown) {
    return rejectWithValue(getApiErrorMessage(err, 'Failed to create workflow'));
  }
});

export const updateWorkflow = createWorkflowAsyncThunk<IWorkflow, WorkflowMutationArgs>(
  'workflow/updateWorkflow',
  async ({ workspaceId, workflowId, input }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(getWorkflowPath(workspaceId, workflowId), input);
      return data.data as IWorkflow;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to update workflow'));
    }
  },
);

export const deleteWorkflow = createWorkflowAsyncThunk<void, WorkflowArgs>(
  'workflow/deleteWorkflow',
  async ({ workspaceId, workflowId }, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(getWorkflowPath(workspaceId, workflowId));
      dispatch(fetchWorkflows({ workspaceId }));
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to delete workflow'));
    }
  },
);

export const duplicateWorkflow = createWorkflowAsyncThunk<void, WorkflowArgs>(
  'workflow/duplicateWorkflow',
  async ({ workspaceId, workflowId }, { dispatch, rejectWithValue }) => {
    try {
      await api.post(`${getWorkflowPath(workspaceId, workflowId)}/duplicate`);
      dispatch(fetchWorkflows({ workspaceId }));
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to duplicate workflow'));
    }
  },
);

export const activateWorkflow = createWorkflowAsyncThunk<IWorkflow, WorkflowArgs>(
  'workflow/activateWorkflow',
  async ({ workspaceId, workflowId }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.post(`${getWorkflowPath(workspaceId, workflowId)}/activate`);
      dispatch(fetchWorkflows({ workspaceId }));
      return data.data as IWorkflow;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to activate workflow'));
    }
  },
);

export const pauseWorkflow = createWorkflowAsyncThunk<IWorkflow, WorkflowArgs>(
  'workflow/pauseWorkflow',
  async ({ workspaceId, workflowId }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.post(`${getWorkflowPath(workspaceId, workflowId)}/pause`);
      dispatch(fetchWorkflows({ workspaceId }));
      return data.data as IWorkflow;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to pause workflow'));
    }
  },
);

export const executeWorkflow = createWorkflowAsyncThunk<string, WorkflowExecutionArgs>(
  'workflow/executeWorkflow',
  async ({ workspaceId, workflowId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`${getWorkflowPath(workspaceId, workflowId)}/execute`, {
        payload,
      });
      return data.data.id as string;
    } catch (err: unknown) {
      const context = (err as WorkflowExecutionError).response?.data?.context;
      const contextSuffix =
        context && typeof context.used === 'number' && typeof context.limit === 'number'
          ? ` (${context.used}/${context.limit} used this month)`
          : '';

      return rejectWithValue(
        `${getApiErrorMessage(err, 'Failed to execute workflow')}${contextSuffix}`,
      );
    }
  },
);

export const fetchTemplates = createWorkflowAsyncThunk<
  IWorkflowListItem[],
  { workspaceId: string }
>('workflow/fetchTemplates', async ({ workspaceId }, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`${getWorkflowTemplatesPath(workspaceId)}/list`);
    return data.data as IWorkflowListItem[];
  } catch (err: unknown) {
    return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch templates'));
  }
});

export const createFromTemplate = createWorkflowAsyncThunk<IWorkflow, WorkflowTemplateArgs>(
  'workflow/useTemplate',
  async ({ workspaceId, templateId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`${getWorkflowTemplatesPath(workspaceId)}/${templateId}/use`);
      return data.data as IWorkflow;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to create workflow from template'));
    }
  },
);

// Super Admin Template Management - Global templates don't need workspaceId
const ADMIN_TEMPLATES_PATH = '/admin/workflows/templates';

export const fetchGlobalTemplate = createWorkflowAsyncThunk<IWorkflow, { templateId: string }>(
  'workflow/fetchGlobalTemplate',
  async ({ templateId }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`${ADMIN_TEMPLATES_PATH}/${templateId}`);
      return data.data as IWorkflow;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch global template'));
    }
  },
);

export const createGlobalTemplate = createWorkflowAsyncThunk<
  IWorkflow,
  { input: Record<string, unknown> }
>('workflow/createGlobalTemplate', async ({ input }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(ADMIN_TEMPLATES_PATH, input);
    return data.data as IWorkflow;
  } catch (err: unknown) {
    return rejectWithValue(getApiErrorMessage(err, 'Failed to create global template'));
  }
});

export const updateGlobalTemplate = createWorkflowAsyncThunk<
  IWorkflow,
  { templateId: string; input: Record<string, unknown> }
>('workflow/updateGlobalTemplate', async ({ templateId, input }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`${ADMIN_TEMPLATES_PATH}/${templateId}`, input);
    return data.data as IWorkflow;
  } catch (err: unknown) {
    return rejectWithValue(getApiErrorMessage(err, 'Failed to update global template'));
  }
});

export const deleteGlobalTemplate = createWorkflowAsyncThunk<void, { templateId: string }>(
  'workflow/deleteGlobalTemplate',
  async ({ templateId }, { rejectWithValue }) => {
    try {
      await api.delete(`${ADMIN_TEMPLATES_PATH}/${templateId}`);
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to delete global template'));
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
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.workflows = action.payload.workflows;
        state.pagination = action.payload.pagination;
        state.isLoading = false;
      })
      .addCase(fetchWorkflow.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchTemplates.pending, (state) => {
        state.isLoadingTemplates = true;
        state.error = null;
      })
      .addCase(fetchGlobalTemplate.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
        state.isLoading = false;
      })
      .addCase(createGlobalTemplate.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
        state.isLoading = false;
      })
      .addCase(updateGlobalTemplate.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
      })
      .addMatcher(
        isAnyOf(
          createWorkflow.rejected,
          createGlobalTemplate.rejected,
          updateWorkflow.rejected,
          updateGlobalTemplate.rejected,
          deleteWorkflow.rejected,
          duplicateWorkflow.rejected,
          activateWorkflow.rejected,
          pauseWorkflow.rejected,
          executeWorkflow.rejected,
          createFromTemplate.rejected,
          fetchGlobalTemplate.rejected,
        ),
        (state, action) => {
          setWorkflowError(state, action.payload);
        },
      );
  },
});

export const { clearWorkflowError } = workflowSlice.actions;
export const workflowReducer = workflowSlice.reducer;
