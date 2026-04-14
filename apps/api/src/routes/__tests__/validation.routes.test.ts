import http from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../server';
import { Execution } from '../../models/execution.model';
import { Workflow } from '../../models/workflow.model';

interface AuthContext {
  token: string;
  workspaceId: string;
}

interface ApiResponsePayload {
  success?: boolean;
  error?: string;
  context?: {
    errors?: string[];
  };
  data?: unknown;
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe('API validation hardening', () => {
  let mongoServer: MongoMemoryServer;
  let server: http.Server;
  let baseUrl: string;
  let auth: AuthContext;

  const request = (
    path: string,
    options: { method?: string; token?: string; body?: unknown } = {},
  ) =>
    fetch(`${baseUrl}/api/v1${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });

  const createWorkflow = async (input: Record<string, unknown>) => {
    const response = await request(`/workspaces/${auth.workspaceId}/workflows`, {
      method: 'POST',
      token: auth.token,
      body: input,
    });
    const payload = await parseJson<ApiResponsePayload>(response);
    return { response, payload };
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    const email = `validation_${Date.now()}@example.com`;
    const registerResponse = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Validation User',
        email,
        password: 'Password123',
      },
    });
    expect(registerResponse.status).toBe(201);
    const registerPayload = await parseJson<ApiResponsePayload>(registerResponse);
    const registerData = registerPayload.data as
      | {
          verificationToken?: string;
        }
      | undefined;
    const verificationToken = registerData?.verificationToken;
    expect(typeof verificationToken).toBe('string');

    const verifyResponse = await request('/auth/verify-email', {
      method: 'POST',
      body: {
        token: verificationToken,
      },
    });
    expect(verifyResponse.status).toBe(200);
    const verifyPayload = await parseJson<ApiResponsePayload>(verifyResponse);
    const verifyData = verifyPayload.data as
      | {
          tokens?: {
            accessToken?: string;
          };
        }
      | undefined;

    const token = verifyData?.tokens?.accessToken;
    expect(typeof token).toBe('string');

    const workspacesResponse = await request('/workspaces', { token });
    expect(workspacesResponse.status).toBe(200);
    const workspacesPayload = await parseJson<ApiResponsePayload>(workspacesResponse);
    const workspaces = (workspacesPayload.data as Array<{ id?: string }> | undefined) || [];
    const workspaceId = workspaces[0]?.id;
    expect(typeof workspaceId).toBe('string');
    if (!token || !workspaceId) {
      throw new Error('Missing auth bootstrap data');
    }

    auth = { token, workspaceId };
  });

  afterEach(async () => {
    await Promise.all([Execution.deleteMany({}), Workflow.deleteMany({})]);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }),
    );
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('returns 422 for invalid workspace update body', async () => {
    const response = await request(`/workspaces/${auth.workspaceId}`, {
      method: 'PATCH',
      token: auth.token,
      body: { name: 'a' },
    });
    const payload = await parseJson<ApiResponsePayload>(response);

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Validation failed');
    expect(Array.isArray(payload.context?.errors)).toBe(true);
  });

  it('returns 422 for invalid params/query on workflow and execution endpoints', async () => {
    const invalidWorkflowParams = await request('/workspaces/not-an-id/workflows', {
      token: auth.token,
    });
    const invalidWorkflowParamsPayload = await parseJson<ApiResponsePayload>(invalidWorkflowParams);
    expect(invalidWorkflowParams.status).toBe(422);
    expect(invalidWorkflowParamsPayload.error).toBe('Validation failed');

    const invalidExecutionQuery = await request(
      `/workspaces/${auth.workspaceId}/executions?limit=abc`,
      {
        token: auth.token,
      },
    );
    const invalidExecutionQueryPayload = await parseJson<ApiResponsePayload>(invalidExecutionQuery);
    expect(invalidExecutionQuery.status).toBe(422);
    expect(invalidExecutionQueryPayload.error).toBe('Validation failed');
  });

  it('returns 422 for invalid execute payload', async () => {
    const created = await createWorkflow({
      name: 'Execute Validation Workflow',
      description: '',
      trigger: { type: 'manual', config: {} },
      steps: [],
      variables: [],
    });
    expect(created.response.status).toBe(201);

    const workflowId = (created.payload.data as { id?: string } | undefined)?.id;
    expect(typeof workflowId).toBe('string');
    const response = await request(
      `/workspaces/${auth.workspaceId}/workflows/${workflowId}/execute`,
      {
        method: 'POST',
        token: auth.token,
        body: { payload: 'invalid' },
      },
    );
    const payload = await parseJson<ApiResponsePayload>(response);

    expect(response.status).toBe(422);
    expect(payload.error).toBe('Validation failed');
    expect(payload.context?.errors?.[0]).toContain('payload');
  });

  it('rejects invalid step config during workflow create', async () => {
    const response = await createWorkflow({
      name: 'Invalid Create Config Workflow',
      description: '',
      trigger: { type: 'manual', config: {} },
      steps: [
        {
          id: 'step-1',
          type: 'delay',
          name: 'Delay Step',
          config: { durationMs: -1 },
          position: { x: 0, y: 0 },
          connections: [],
        },
      ],
      variables: [],
    });

    expect(response.response.status).toBe(422);
    expect(response.payload.error).toContain('Invalid config for step');
    expect(response.payload.context?.errors).toContain('durationMs must be a positive number');
  });

  it('rejects invalid step config during workflow update', async () => {
    const created = await createWorkflow({
      name: 'Invalid Update Config Workflow',
      description: '',
      trigger: { type: 'manual', config: {} },
      steps: [],
      variables: [],
    });
    expect(created.response.status).toBe(201);

    const workflowId = (created.payload.data as { id?: string } | undefined)?.id;
    expect(typeof workflowId).toBe('string');
    const response = await request(`/workspaces/${auth.workspaceId}/workflows/${workflowId}`, {
      method: 'PATCH',
      token: auth.token,
      body: {
        steps: [
          {
            id: 'step-1',
            type: 'delay',
            name: 'Delay Step',
            config: { durationMs: 'oops' },
            position: { x: 100, y: 120 },
            connections: [],
          },
        ],
      },
    });
    const payload = await parseJson<ApiResponsePayload>(response);

    expect(response.status).toBe(422);
    expect(payload.error).toContain('Invalid config for step');
    expect(payload.context?.errors).toContain('durationMs must be a positive number');
  });
});
