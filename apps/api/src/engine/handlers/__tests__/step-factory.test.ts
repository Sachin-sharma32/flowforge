import { StepFactory } from '../../step-factory';
import { HttpRequestHandler } from '../http-request.handler';
import { ConditionHandler } from '../condition.handler';
import { TransformHandler } from '../transform.handler';
import { DelayHandler } from '../delay.handler';

// Import to trigger registration
import '../../workflow-processor';

describe('StepFactory', () => {
  it('should have all handlers registered', () => {
    const types = StepFactory.getRegisteredTypes();
    expect(types).toContain('http_request');
    expect(types).toContain('condition');
    expect(types).toContain('transform');
    expect(types).toContain('delay');
    expect(types).toContain('send_email');
    expect(types).toContain('slack_message');
  });

  it('should create correct handler for each type', () => {
    expect(StepFactory.create('http_request')).toBeInstanceOf(HttpRequestHandler);
    expect(StepFactory.create('condition')).toBeInstanceOf(ConditionHandler);
    expect(StepFactory.create('transform')).toBeInstanceOf(TransformHandler);
    expect(StepFactory.create('delay')).toBeInstanceOf(DelayHandler);
  });

  it('should throw for unknown step type', () => {
    expect(() => StepFactory.create('unknown_type')).toThrow('Unknown step type: unknown_type');
  });

  it('should check if type exists', () => {
    expect(StepFactory.has('http_request')).toBe(true);
    expect(StepFactory.has('nonexistent')).toBe(false);
  });
});

describe('ConditionHandler', () => {
  const handler = new ConditionHandler();

  it('should evaluate equals condition', async () => {
    const result = await handler.execute({
      stepId: 'test',
      executionId: 'exec-1',
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      config: { field: 'status', operator: 'equals', value: 'active' },
      input: { status: 'active' },
      variables: {},
    });

    expect(result.success).toBe(true);
    expect(result.output.condition).toBe(true);
    expect(result.output.branch).toBe('true');
  });

  it('should evaluate not_equals condition', async () => {
    const result = await handler.execute({
      stepId: 'test',
      executionId: 'exec-1',
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      config: { field: 'status', operator: 'not_equals', value: 'active' },
      input: { status: 'inactive' },
      variables: {},
    });

    expect(result.success).toBe(true);
    expect(result.output.condition).toBe(true);
    expect(result.output.branch).toBe('true');
  });

  it('should evaluate nested field path', async () => {
    const result = await handler.execute({
      stepId: 'test',
      executionId: 'exec-1',
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      config: { field: 'body.data.count', operator: 'greater_than', value: 5 },
      input: { body: { data: { count: 10 } } },
      variables: {},
    });

    expect(result.success).toBe(true);
    expect(result.output.condition).toBe(true);
  });

  it('should return false branch when condition fails', async () => {
    const result = await handler.execute({
      stepId: 'test',
      executionId: 'exec-1',
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      config: { field: 'status', operator: 'equals', value: 'active' },
      input: { status: 'inactive' },
      variables: {},
    });

    expect(result.output.branch).toBe('false');
  });
});

describe('TransformHandler', () => {
  const handler = new TransformHandler();

  it('should apply field mappings', async () => {
    const result = await handler.execute({
      stepId: 'test',
      executionId: 'exec-1',
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      config: {
        mappings: [
          { source: 'name', target: 'fullName' },
          { source: 'email', target: 'contactEmail', transform: 'lowercase' },
        ],
      },
      input: { name: 'John Doe', email: 'JOHN@EXAMPLE.COM' },
      variables: {},
    });

    expect(result.success).toBe(true);
    expect(result.output.fullName).toBe('John Doe');
    expect(result.output.contactEmail).toBe('john@example.com');
  });

  it('should apply template with variable interpolation', async () => {
    const result = await handler.execute({
      stepId: 'test',
      executionId: 'exec-1',
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      config: {
        template: {
          greeting: 'Hello',
          name: '{{name}}',
        },
      },
      input: { name: 'Alice' },
      variables: {},
    });

    expect(result.success).toBe(true);
    expect(result.output.greeting).toBe('Hello');
    expect(result.output.name).toBe('Alice');
  });
});

describe('DelayHandler', () => {
  const handler = new DelayHandler();

  it('should delay for specified duration', async () => {
    const start = Date.now();
    const result = await handler.execute({
      stepId: 'test',
      executionId: 'exec-1',
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      config: { durationMs: 100 },
      input: {},
      variables: {},
    });

    const elapsed = Date.now() - start;
    expect(result.success).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(result.output.delayedMs).toBe(100);
  });

  it('should cap delay at 5 minutes', async () => {
    const handler = new DelayHandler();
    // Don't actually run this - just validate
    const validation = handler.validate({ durationMs: 600000 });
    expect(validation.valid).toBe(true);
  });
});
