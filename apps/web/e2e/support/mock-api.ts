import type { Page, Route } from '@playwright/test';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MockWorkspace {
  id: string;
  name: string;
  slug: string;
  members: Array<{ userId: string; role: string; joinedAt: string }>;
  settings?: { defaultTimezone?: string; webhookSecret?: string };
}

interface MockWorkflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  trigger: { type: string; config: Record<string, unknown> };
  steps: Array<{
    id: string;
    type: string;
    name: string;
    config: Record<string, unknown>;
    position: { x: number; y: number };
    connections: Array<{ targetStepId: string; label: string }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface MockExecution {
  id: string;
  status: string;
  trigger: { type: string };
  workflowId: { id: string; name: string };
  steps: Array<Record<string, unknown>>;
  createdAt: string;
  durationMs?: number;
}

interface AuthOverrides {
  loginSuccess?: boolean;
  registerSuccess?: boolean;
  meAuthorized?: boolean;
  errorMessage?: string;
  user?: Partial<MockUser>;
}

interface WorkspaceOverrides {
  list?: MockWorkspace[];
}

interface WorkflowOverrides {
  list?: MockWorkflow[];
  detailById?: Record<string, MockWorkflow>;
  createResultId?: string;
}

interface ExecutionOverrides {
  list?: MockExecution[];
}

export interface MockApiOverrides {
  auth?: AuthOverrides;
  workspaces?: WorkspaceOverrides;
  workflows?: WorkflowOverrides;
  executions?: ExecutionOverrides;
}

interface MockApiState {
  auth: Required<AuthOverrides> & { user: MockUser };
  workspaces: MockWorkspace[];
  workflows: MockWorkflow[];
  workflowById: Record<string, MockWorkflow>;
  executions: MockExecution[];
  createdWorkflowId: string;
}

const nowIso = '2026-04-13T12:00:00.000Z';

const defaultUser: MockUser = {
  id: 'user-1',
  name: 'Playwright User',
  email: 'playwright@flowforge.dev',
  role: 'Owner',
};

const defaultWorkspace: MockWorkspace = {
  id: 'ws-1',
  name: 'Playwright Workspace',
  slug: 'playwright-workspace',
  members: [{ userId: 'user-1', role: 'Owner', joinedAt: nowIso }],
  settings: { defaultTimezone: 'UTC' },
};

const defaultWorkflow: MockWorkflow = {
  id: 'wf-1',
  name: 'Playwright Workflow',
  description: 'Baseline mocked workflow',
  status: 'draft',
  version: 1,
  trigger: { type: 'manual', config: {} },
  steps: [],
  createdAt: nowIso,
  updatedAt: nowIso,
};

const defaultExecution: MockExecution = {
  id: 'exec-1',
  status: 'completed',
  trigger: { type: 'manual' },
  workflowId: { id: 'wf-1', name: 'Playwright Workflow' },
  steps: [],
  createdAt: nowIso,
  durationMs: 120,
};

function success<T>(data: T, extras?: Record<string, unknown>) {
  return {
    success: true,
    data,
    ...(extras ?? {}),
  };
}

function error(message: string) {
  return {
    success: false,
    error: message,
  };
}

function defaultPagination(total: number) {
  return {
    page: 1,
    limit: 20,
    total,
    totalPages: Math.max(1, Math.ceil(total / 20)),
  };
}

function buildState(overrides: MockApiOverrides): MockApiState {
  const user: MockUser = {
    ...defaultUser,
    ...(overrides.auth?.user ?? {}),
  };

  const workflows = overrides.workflows?.list ?? [defaultWorkflow];
  const workflowById: Record<string, MockWorkflow> = {
    [defaultWorkflow.id]: defaultWorkflow,
    ...(overrides.workflows?.detailById ?? {}),
  };

  for (const workflow of workflows) {
    workflowById[workflow.id] = workflow;
  }

  return {
    auth: {
      loginSuccess: overrides.auth?.loginSuccess ?? true,
      registerSuccess: overrides.auth?.registerSuccess ?? true,
      meAuthorized: overrides.auth?.meAuthorized ?? true,
      errorMessage: overrides.auth?.errorMessage ?? 'Invalid credentials',
      user,
    },
    workspaces: overrides.workspaces?.list ?? [defaultWorkspace],
    workflows,
    workflowById,
    executions: overrides.executions?.list ?? [defaultExecution],
    createdWorkflowId: overrides.workflows?.createResultId ?? 'wf-created-1',
  };
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installApiMocks(page: Page, overrides: MockApiOverrides = {}) {
  const state = buildState(overrides);

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (method === 'POST' && path.endsWith('/auth/login')) {
      if (!state.auth.loginSuccess) {
        await fulfillJson(route, 401, error(state.auth.errorMessage));
        return;
      }

      await fulfillJson(
        route,
        200,
        success({
          user: state.auth.user,
          tokens: {
            accessToken: 'mock-access-token',
          },
        }),
      );
      return;
    }

    if (method === 'POST' && path.endsWith('/auth/register')) {
      if (!state.auth.registerSuccess) {
        await fulfillJson(route, 400, error('Registration failed'));
        return;
      }

      await fulfillJson(
        route,
        201,
        success({
          requiresEmailVerification: true,
        }),
      );
      return;
    }

    if (method === 'POST' && path.endsWith('/auth/resend-verification')) {
      await fulfillJson(
        route,
        200,
        success({
          message: 'If an unverified account exists, a new verification link has been sent.',
        }),
      );
      return;
    }

    if (method === 'GET' && path.endsWith('/auth/me')) {
      if (!state.auth.meAuthorized) {
        await fulfillJson(route, 401, error('Unauthorized'));
        return;
      }

      await fulfillJson(route, 200, success(state.auth.user));
      return;
    }

    if (method === 'POST' && path.endsWith('/auth/refresh')) {
      if (!state.auth.meAuthorized) {
        await fulfillJson(route, 401, error('Unauthorized'));
        return;
      }

      await fulfillJson(
        route,
        200,
        success({
          tokens: {
            accessToken: 'mock-refreshed-token',
          },
        }),
      );
      return;
    }

    if (method === 'POST' && path.endsWith('/auth/logout')) {
      await fulfillJson(route, 200, success({ revoked: true }));
      return;
    }

    if (method === 'GET' && path.endsWith('/workspaces')) {
      await fulfillJson(route, 200, success(state.workspaces));
      return;
    }

    if (method === 'GET' && /\/workspaces\/[^/]+\/executions\/stats\/timeline$/.test(path)) {
      await fulfillJson(
        route,
        200,
        success([
          { date: '2026-04-11', total: 2, completed: 2, failed: 0 },
          { date: '2026-04-12', total: 1, completed: 1, failed: 0 },
          { date: '2026-04-13', total: 1, completed: 1, failed: 0 },
        ]),
      );
      return;
    }

    if (method === 'GET' && /\/workspaces\/[^/]+\/executions\/stats\/by-workflow$/.test(path)) {
      await fulfillJson(
        route,
        200,
        success([
          {
            workflowId: 'wf-1',
            workflowName: 'Playwright Workflow',
            total: 4,
            completed: 4,
            failed: 0,
            successRate: 100,
            avgDurationMs: 120,
          },
        ]),
      );
      return;
    }

    if (method === 'GET' && /\/workspaces\/[^/]+\/executions\/stats$/.test(path)) {
      await fulfillJson(
        route,
        200,
        success({
          total: state.executions.length,
          completed: state.executions.filter((execution) => execution.status === 'completed')
            .length,
          failed: state.executions.filter((execution) => execution.status === 'failed').length,
          running: state.executions.filter((execution) => execution.status === 'running').length,
          pending: state.executions.filter((execution) => execution.status === 'pending').length,
          cancelled: state.executions.filter((execution) => execution.status === 'cancelled')
            .length,
          successRate: 100,
          avgDurationMs: 120,
        }),
      );
      return;
    }

    if (method === 'GET' && /\/workspaces\/[^/]+\/executions$/.test(path)) {
      await fulfillJson(
        route,
        200,
        success(state.executions, {
          pagination: defaultPagination(state.executions.length),
        }),
      );
      return;
    }

    if (method === 'POST' && /\/workspaces\/[^/]+\/workflows\/[^/]+\/execute$/.test(path)) {
      await fulfillJson(route, 200, success({ id: 'exec-queued-1' }));
      return;
    }

    if (method === 'GET' && /\/workspaces\/[^/]+\/workflows\/[^/]+$/.test(path)) {
      const workflowId = path.split('/').at(-1);
      if (!workflowId || !state.workflowById[workflowId]) {
        await fulfillJson(route, 404, error('Workflow not found'));
        return;
      }

      await fulfillJson(route, 200, success(state.workflowById[workflowId]));
      return;
    }

    if (method === 'GET' && /\/workspaces\/[^/]+\/workflows$/.test(path)) {
      await fulfillJson(
        route,
        200,
        success(state.workflows, {
          pagination: defaultPagination(state.workflows.length),
        }),
      );
      return;
    }

    if (method === 'POST' && /\/workspaces\/[^/]+\/workflows$/.test(path)) {
      const requestBody = request.postDataJSON() as {
        name?: string;
        description?: string;
        trigger?: { type?: string; config?: Record<string, unknown> };
        steps?: MockWorkflow['steps'];
      };

      const createdWorkflow: MockWorkflow = {
        id: state.createdWorkflowId,
        name: requestBody.name || 'Created workflow',
        description: requestBody.description || '',
        status: 'draft',
        version: 1,
        trigger: {
          type: requestBody.trigger?.type || 'manual',
          config: requestBody.trigger?.config || {},
        },
        steps: requestBody.steps || [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      state.workflowById[createdWorkflow.id] = createdWorkflow;
      state.workflows = [createdWorkflow, ...state.workflows];

      await fulfillJson(route, 201, success(createdWorkflow));
      return;
    }

    await fulfillJson(route, 404, error(`No mock route defined for ${method} ${path}`));
  });
}
