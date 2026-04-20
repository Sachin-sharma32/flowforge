import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowDocument extends Document {
  workspaceId?: mongoose.Types.ObjectId | null;
  folderId?: mongoose.Types.ObjectId | null;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  isTemplate: boolean;
  isGlobalTemplate: boolean;
  category?: string;
  trigger: {
    type: 'webhook' | 'cron' | 'manual';
    config: Record<string, unknown>;
  };
  steps: Array<{
    id: string;
    type: string;
    name: string;
    config: Record<string, unknown>;
    position: { x: number; y: number };
    connections: Array<{ targetStepId: string; label: string }>;
  }>;
  variables: Array<{ key: string; value: string; isSecret: boolean }>;
  version: number;
  lastExecutedAt?: Date;
  useCount: number;
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const workflowSchema = new Schema<IWorkflowDocument>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true,
      default: null,
      sparse: true,
    },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', index: true, default: null },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
    },
    isTemplate: { type: Boolean, default: false, index: true },
    isGlobalTemplate: { type: Boolean, default: false, index: true },
    category: { type: String, default: null },
    trigger: {
      type: { type: String, enum: ['webhook', 'cron', 'manual'], required: true },
      config: { type: Schema.Types.Mixed, default: {} },
    },
    steps: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        name: { type: String, required: true },
        config: { type: Schema.Types.Mixed, default: {} },
        position: {
          x: { type: Number, default: 0 },
          y: { type: Number, default: 0 },
        },
        connections: [
          {
            targetStepId: { type: String, required: true },
            label: { type: String, default: 'next' },
          },
        ],
      },
    ],
    variables: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
        isSecret: { type: Boolean, default: false },
      },
    ],
    version: { type: Number, default: 1 },
    lastExecutedAt: { type: Date },
    useCount: { type: Number, default: 0, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

workflowSchema.index({ workspaceId: 1, status: 1 });
workflowSchema.index({ workspaceId: 1, folderId: 1 });
workflowSchema.index({ 'trigger.type': 1 });

workflowSchema.set('toJSON', {
  transform(_doc, ret: Record<string, any>) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export const Workflow = mongoose.model<IWorkflowDocument>('Workflow', workflowSchema);
