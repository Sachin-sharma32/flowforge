import { describe, expect, it } from 'vitest';
import type { RootState } from '@/stores/store';
import {
  selectCurrentWorkspaceId,
  selectDashboardStatValues,
  selectExecutionById,
  selectWorkflowById,
  selectWorkflowExecutionAnalytics,
} from '@/stores/selectors';

function dateIsoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function createState(): RootState {
  const oneDayAgo = dateIsoDaysAgo(1);
  const today = dateIsoDaysAgo(0);

  return {
    auth: {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    },
    workspace: {
      workspaces: [
        {
          id: 'ws-1',
          name: 'Main Workspace',
          slug: 'main-workspace',
          members: [
            {
              userId: 'user-1',
              role: 'Owner',
              joinedAt: '2026-04-13T10:00:00.000Z',
            },
          ],
        },
      ],
      currentWorkspace: {
        id: 'ws-1',
        name: 'Main Workspace',
        slug: 'main-workspace',
        members: [
          {
            userId: 'user-1',
            role: 'Owner',
            joinedAt: '2026-04-13T10:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    },
    workflow: {
      workflows: [
        {
          id: 'wf-1',
          name: 'Orders Flow',
          description: 'Routes orders to operations',
          status: 'draft',
          trigger: { type: 'manual' },
          steps: [],
          updatedAt: '2026-04-13T11:00:00.000Z',
          createdAt: '2026-04-12T11:00:00.000Z',
          version: 1,
        },
      ],
      currentWorkflow: null,
      isLoading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    },
    execution: {
      executions: [
        {
          id: 'exec-1',
          status: 'completed',
          durationMs: 100,
          createdAt: oneDayAgo,
        },
        {
          id: 'exec-2',
          status: 'failed',
          durationMs: 400,
          createdAt: today,
        },
        {
          id: 'exec-3',
          status: 'completed',
          durationMs: 200,
          createdAt: today,
        },
      ],
      currentExecution: null,
      stats: {
        total: 3,
        completed: 2,
        failed: 1,
        running: 0,
        pending: 0,
        cancelled: 0,
        successRate: 67,
        avgDurationMs: 233,
      },
      timeline: [],
      workflowStats: [],
      isLoading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      },
    },
    folder: {
      folders: [],
      isLoading: false,
      error: null,
    },
  } as unknown as RootState;
}

describe('store selectors', () => {
  it('returns the current workspace id', () => {
    const state = createState();

    expect(selectCurrentWorkspaceId(state)).toBe('ws-1');
  });

  it('memoizes dashboard stat values for the same state reference', () => {
    const state = createState();

    const first = selectDashboardStatValues(state);
    const second = selectDashboardStatValues(state);

    expect(first).toBe(second);
    expect(first).toEqual({
      workflowCount: 1,
      totalExecutions: 3,
      successRate: 67,
      avgDurationMs: 233,
    });
  });

  it('builds workflow analytics summary and timeline from executions', () => {
    const state = createState();
    const yesterdayKey = dateIsoDaysAgo(1).split('T')[0];
    const todayKey = dateIsoDaysAgo(0).split('T')[0];

    const analytics = selectWorkflowExecutionAnalytics(state);

    expect(analytics.summary).toEqual({
      total: 3,
      completed: 2,
      failed: 1,
      successRate: 67,
      avgDurationMs: 233,
    });

    const dayOne = analytics.timeline.find((point) => point.date === yesterdayKey);
    const dayTwo = analytics.timeline.find((point) => point.date === todayKey);

    expect(dayOne).toMatchObject({ total: 1, completed: 1, failed: 0 });
    expect(dayTwo).toMatchObject({ total: 2, completed: 1, failed: 1 });
  });

  it('memoizes workflow analytics for the same state reference', () => {
    const state = createState();

    const first = selectWorkflowExecutionAnalytics(state);
    const second = selectWorkflowExecutionAnalytics(state);

    expect(first).toBe(second);
  });

  it('resolves workflow and execution by id', () => {
    const state = createState();

    expect(selectWorkflowById(state, 'wf-1')?.name).toBe('Orders Flow');
    expect(selectExecutionById(state, 'exec-3')?.status).toBe('completed');
    expect(selectWorkflowById(state, 'missing-id')).toBeUndefined();
    expect(selectExecutionById(state, 'missing-id')).toBeUndefined();
  });
});
