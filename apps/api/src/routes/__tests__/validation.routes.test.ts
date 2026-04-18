import http from 'node:http';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../server';
import { Execution } from '../../models/execution.model';
import { Workflow } from '../../models/workflow.model';
import { Folder } from '../../models/folder.model';
import { User } from '../../models/user.model';
import { authLimiter } from '../../middleware/rate-limit.middleware';

interface AuthContext {
  token: string;
  workspaceId: string;
}

interface ApiResponsePayload {
  success?: boolean;
  error?: string;
  context?: {
    errors?: string[];
    code?: string;
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
          verificationState?: string;
          verificationToken?: string;
        }
      | undefined;
    expect(registerData?.verificationState).toBe('created');
    const verificationToken = registerData?.verificationToken;
    if (verificationToken) {
      const verifyResponse = await request('/auth/verify-email', {
        method: 'POST',
        body: {
          token: verificationToken,
        },
      });
      expect(verifyResponse.status).toBe(200);
    }

    const loginResponse = await request('/auth/login', {
      method: 'POST',
      body: {
        email,
        password: 'Password123',
      },
    });
    expect(loginResponse.status).toBe(200);
    const loginPayload = await parseJson<ApiResponsePayload>(loginResponse);
    const loginData = loginPayload.data as
      | {
          tokens?: {
            accessToken?: string;
          };
        }
      | undefined;

    const token = loginData?.tokens?.accessToken;
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
    await Promise.all([Execution.deleteMany({}), Workflow.deleteMany({}), Folder.deleteMany({})]);
    authLimiter.resetKey('127.0.0.1');
    authLimiter.resetKey('::1');
    authLimiter.resetKey('::ffff:127.0.0.1');
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

  it('returns pending verification instead of a conflict for duplicate unverified registration', async () => {
    const email = `pending_${Date.now()}@example.com`;
    const firstResponse = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Pending User',
        email,
        password: 'Password123',
      },
    });
    expect(firstResponse.status).toBe(201);

    const user = await User.findOne({ email });
    user!.isVerified = false;
    user!.name = 'Pending User';
    await user!.save();

    const secondResponse = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Another Name',
        email,
        password: 'Password456',
      },
    });
    const secondPayload = await parseJson<ApiResponsePayload>(secondResponse);
    const secondData = secondPayload.data as
      | { verificationState?: string; email?: string }
      | undefined;

    expect(secondResponse.status).toBe(201);
    expect(secondPayload.success).toBe(true);
    expect(secondData?.verificationState).toBe('resent');
    expect(secondData?.email).toBe(email);
    expect(await User.countDocuments({ email })).toBe(1);

    const updatedUser = await User.findOne({ email });
    expect(updatedUser?.name).toBe('Pending User');
    expect(await updatedUser!.comparePassword('Password123')).toBe(true);
    expect(await updatedUser!.comparePassword('Password456')).toBe(false);
  });

  it('returns a coded conflict for duplicate verified registration', async () => {
    const email = `verified_${Date.now()}@example.com`;
    const firstResponse = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Verified User',
        email,
        password: 'Password123',
      },
    });
    expect(firstResponse.status).toBe(201);

    const secondResponse = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Verified User Again',
        email,
        password: 'Password456',
      },
    });
    const secondPayload = await parseJson<ApiResponsePayload>(secondResponse);

    expect(secondResponse.status).toBe(409);
    expect(secondPayload.error).toBe('Email already registered');
    expect(secondPayload.context).toEqual({ code: 'EMAIL_ALREADY_REGISTERED' });
  });

  it('redirects email verification links back to login without creating a session', async () => {
    const email = `redirect_${Date.now()}@example.com`;
    const registerResponse = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Redirect User',
        email,
        password: 'Password123',
      },
    });
    expect(registerResponse.status).toBe(201);

    const registerPayload = await parseJson<ApiResponsePayload>(registerResponse);
    let verificationToken = (registerPayload.data as { verificationToken?: string } | undefined)
      ?.verificationToken;
    if (!verificationToken) {
      // If testing in an environment that doesn't generate tokens, manually create a token and unverify the user
      const user = await mongoose.model('User').findOne({ email });
      user.isVerified = false;

      verificationToken = 'mock-verification-token';
      user.emailVerificationTokenHash = createHash('sha256')
        .update(verificationToken)
        .digest('hex');
      user.emailVerificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60);
      await user.save();
    }

    expect(typeof verificationToken).toBe('string');

    const verificationLinkResponse = await fetch(
      `${baseUrl}/api/v1/auth/verify-email?token=${verificationToken}`,
      {
        redirect: 'manual',
      },
    );
    expect(verificationLinkResponse.status).toBe(302);
    expect(verificationLinkResponse.headers.get('location')).toBe(
      'http://localhost:3000/login?verification=success',
    );
    expect(verificationLinkResponse.headers.get('set-cookie')).toBeNull();
  });

  it('returns 422 for invalid params/query on workflow, execution, folder, and member endpoints', async () => {
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

    const invalidFolderQuery = await request(`/workspaces/${auth.workspaceId}/folders?page=abc`, {
      token: auth.token,
    });
    const invalidFolderQueryPayload = await parseJson<ApiResponsePayload>(invalidFolderQuery);
    expect(invalidFolderQuery.status).toBe(422);
    expect(invalidFolderQueryPayload.error).toBe('Validation failed');

    const invalidMemberQuery = await request(`/workspaces/${auth.workspaceId}/members?limit=abc`, {
      token: auth.token,
    });
    const invalidMemberQueryPayload = await parseJson<ApiResponsePayload>(invalidMemberQuery);
    expect(invalidMemberQuery.status).toBe(422);
    expect(invalidMemberQueryPayload.error).toBe('Validation failed');
  });

  it('returns folder list pagination metadata for paged folder queries', async () => {
    const createFolder = async (name: string) => {
      const response = await request(`/workspaces/${auth.workspaceId}/folders`, {
        method: 'POST',
        token: auth.token,
        body: {
          name,
          description: '',
          color: '#60a5fa',
          accessControl: {
            minViewRole: 'viewer',
            minEditRole: 'editor',
            minExecuteRole: 'editor',
          },
        },
      });
      expect(response.status).toBe(201);
    };

    await createFolder('Ops Folder');
    await createFolder('Sales Folder');

    const response = await request(`/workspaces/${auth.workspaceId}/folders?page=1&limit=1`, {
      token: auth.token,
    });
    const payload = await parseJson<ApiResponsePayload & { pagination?: Record<string, unknown> }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.pagination).toBeDefined();
    expect(payload.pagination?.page).toBe(1);
    expect(payload.pagination?.limit).toBe(1);
    expect(payload.pagination?.total).toBeGreaterThanOrEqual(2);
  });

  it('returns member list pagination metadata', async () => {
    const response = await request(`/workspaces/${auth.workspaceId}/members?page=1&limit=1`, {
      token: auth.token,
    });
    const payload = await parseJson<ApiResponsePayload & { pagination?: Record<string, unknown> }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.data)).toBe(true);
    expect((payload.data as unknown[]).length).toBe(1);
    expect(payload.pagination).toBeDefined();
    expect(payload.pagination?.page).toBe(1);
    expect(payload.pagination?.limit).toBe(1);
    expect(payload.pagination?.total).toBeGreaterThanOrEqual(1);
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

  it('rejects workflow graphs with missing connection targets', async () => {
    const response = await createWorkflow({
      name: 'Invalid Graph Workflow',
      description: '',
      trigger: { type: 'manual', config: {} },
      steps: [
        {
          id: 'step-1',
          type: 'http_request',
          name: 'Call API',
          config: { url: 'https://example.com', method: 'GET' },
          position: { x: 0, y: 0 },
          connections: [{ targetStepId: 'does-not-exist', label: 'next' }],
        },
      ],
      variables: [],
    });

    expect(response.response.status).toBe(422);
    expect(response.payload.error).toContain('Invalid workflow step graph');
    expect(response.payload.context?.errors).toContain(
      'Step "Call API" points to missing target "does-not-exist"',
    );
  });

  it('rejects workflow graphs with circular connections', async () => {
    const response = await createWorkflow({
      name: 'Circular Graph Workflow',
      description: '',
      trigger: { type: 'manual', config: {} },
      steps: [
        {
          id: 'step-1',
          type: 'http_request',
          name: 'Step 1',
          config: { url: 'https://example.com/1', method: 'GET' },
          position: { x: 0, y: 0 },
          connections: [{ targetStepId: 'step-2', label: 'next' }],
        },
        {
          id: 'step-2',
          type: 'http_request',
          name: 'Step 2',
          config: { url: 'https://example.com/2', method: 'GET' },
          position: { x: 0, y: 140 },
          connections: [{ targetStepId: 'step-1', label: 'next' }],
        },
      ],
      variables: [],
    });

    expect(response.response.status).toBe(422);
    expect(response.payload.error).toContain('Invalid workflow step graph');
    expect(response.payload.context?.errors).toContain(
      'Workflow contains circular step connections',
    );
  });
});
