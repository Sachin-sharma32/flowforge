import mongoose from 'mongoose';
import { getCurrentPeriodKey } from '../domain/billing';
import { PaymentRequiredError } from '../domain/errors';
import { OrganizationUsage } from '../models/organization-usage.model';

export interface UsageSnapshot {
  periodKey: string;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}

export class UsageService {
  async reserveExecution(
    organizationId: string,
    plan: 'free' | 'pro' | 'enterprise',
    executionLimit: number,
  ): Promise<UsageSnapshot> {
    if (executionLimit <= 0) {
      throw new PaymentRequiredError('Execution quota exceeded for current billing period', {
        used: 0,
        limit: executionLimit,
        remaining: 0,
        periodKey: getCurrentPeriodKey(),
      });
    }

    const periodKey = getCurrentPeriodKey();
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    const usage = await OrganizationUsage.findOneAndUpdate(
      {
        organizationId: orgObjectId,
        periodKey,
        executionsUsed: { $lt: executionLimit },
      },
      {
        $inc: { executionsUsed: 1 },
        $set: { executionLimit, plan },
      },
      {
        new: true,
      },
    );

    if (usage) {
      return this.toSnapshot(
        periodKey,
        usage.executionsUsed,
        usage.executionLimit || executionLimit,
      );
    }

    try {
      const created = await OrganizationUsage.create({
        organizationId: orgObjectId,
        periodKey,
        executionsUsed: 1,
        executionLimit,
        plan,
      });
      return this.toSnapshot(periodKey, created.executionsUsed, created.executionLimit);
    } catch (error: unknown) {
      if (!this.isDuplicateKeyError(error)) {
        throw error;
      }
    }

    const retried = await OrganizationUsage.findOneAndUpdate(
      {
        organizationId: orgObjectId,
        periodKey,
        executionsUsed: { $lt: executionLimit },
      },
      { $inc: { executionsUsed: 1 }, $set: { executionLimit, plan } },
      { new: true },
    );

    if (retried) {
      return this.toSnapshot(periodKey, retried.executionsUsed, retried.executionLimit);
    }

    const current = await OrganizationUsage.findOne({ organizationId: orgObjectId, periodKey });
    const used = current?.executionsUsed ?? executionLimit;
    throw new PaymentRequiredError('Execution quota exceeded for current billing period', {
      used,
      limit: executionLimit,
      remaining: Math.max(0, executionLimit - used),
      periodKey,
    });
  }

  async getCurrentMonthUsage(
    organizationId: string,
    executionLimit: number,
  ): Promise<UsageSnapshot> {
    const periodKey = getCurrentPeriodKey();
    const usage = await OrganizationUsage.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      periodKey,
    });

    return this.toSnapshot(periodKey, usage?.executionsUsed ?? 0, executionLimit);
  }

  private toSnapshot(periodKey: string, used: number, limit: number): UsageSnapshot {
    const remaining = Math.max(0, limit - used);
    const percentUsed = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

    return {
      periodKey,
      used,
      limit,
      remaining,
      percentUsed,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    return (error as { code?: unknown }).code === 11000;
  }
}
