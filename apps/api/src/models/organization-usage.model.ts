import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganizationUsageDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  periodKey: string;
  executionsUsed: number;
  executionLimit: number;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

const organizationUsageSchema = new Schema<IOrganizationUsageDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    periodKey: { type: String, required: true },
    executionsUsed: { type: Number, default: 0 },
    executionLimit: { type: Number, required: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], required: true },
  },
  { timestamps: true },
);

organizationUsageSchema.index({ organizationId: 1, periodKey: 1 }, { unique: true });
organizationUsageSchema.index({ periodKey: 1 });

organizationUsageSchema.set('toJSON', {
  transform(_doc, ret) {
    const result = ret as unknown as Record<string, unknown>;
    result.id = result._id;
    delete result._id;
    delete result.__v;
  },
});

export const OrganizationUsage = mongoose.model<IOrganizationUsageDocument>(
  'OrganizationUsage',
  organizationUsageSchema,
);
