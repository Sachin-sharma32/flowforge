export type BillingPlan = 'free' | 'pro' | 'enterprise';

export type BillingSubscriptionStatus =
  | 'none'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'canceled';

export interface IMonthlyExecutionUsage {
  periodKey: string;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}

export interface IWorkspaceBillingSummary {
  organizationId: string;
  workspaceId: string;
  plan: BillingPlan;
  subscriptionStatus: BillingSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  usage: IMonthlyExecutionUsage;
  canUpgrade: boolean;
  canCancel: boolean;
}
