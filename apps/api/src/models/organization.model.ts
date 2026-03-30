import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganizationDocument extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  plan: 'free' | 'pro' | 'enterprise';
  limits: {
    maxWorkspaces: number;
    maxWorkflows: number;
    maxExecutionsPerMonth: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    limits: {
      maxWorkspaces: { type: Number, default: 3 },
      maxWorkflows: { type: Number, default: 10 },
      maxExecutionsPerMonth: { type: Number, default: 1000 },
    },
  },
  { timestamps: true },
);

organizationSchema.set('toJSON', {
  transform(_doc, ret: Record<string, any>) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export const Organization = mongoose.model<IOrganizationDocument>(
  'Organization',
  organizationSchema,
);
