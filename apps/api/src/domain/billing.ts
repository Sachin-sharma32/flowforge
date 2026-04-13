import { config } from '../config';

export type BillingPlan = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxWorkspaces: number;
  maxWorkflows: number;
  maxExecutionsPerMonth: number;
}

export function getLimitsForPlan(plan: BillingPlan): PlanLimits {
  switch (plan) {
    case 'pro':
      return {
        maxWorkspaces: 10,
        maxWorkflows: 100,
        maxExecutionsPerMonth: config.PRO_EXECUTION_LIMIT,
      };
    case 'enterprise':
      return {
        maxWorkspaces: 100,
        maxWorkflows: 1000,
        maxExecutionsPerMonth: config.ENTERPRISE_EXECUTION_LIMIT,
      };
    case 'free':
    default:
      return {
        maxWorkspaces: 3,
        maxWorkflows: 10,
        maxExecutionsPerMonth: config.FREE_EXECUTION_LIMIT,
      };
  }
}

export function getCurrentPeriodKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
