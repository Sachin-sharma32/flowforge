import mongoose, { Document, Schema } from 'mongoose';

export interface IExecutionDocument extends Document {
  workflowId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: {
    type: string;
    payload?: Record<string, unknown>;
  };
  steps: Array<{
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
  }>;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  createdAt: Date;
}

const executionSchema = new Schema<IExecutionDocument>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    trigger: {
      type: { type: String, required: true },
      payload: { type: Schema.Types.Mixed },
    },
    steps: [
      {
        stepId: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
          default: 'pending',
        },
        input: { type: Schema.Types.Mixed },
        output: { type: Schema.Types.Mixed },
        error: { type: String },
        startedAt: { type: Date },
        completedAt: { type: Date },
        durationMs: { type: Number },
      },
    ],
    startedAt: { type: Date },
    completedAt: { type: Date },
    durationMs: { type: Number },
  },
  { timestamps: true },
);

executionSchema.index({ workflowId: 1, createdAt: -1 });
executionSchema.index({ workspaceId: 1, status: 1 });

executionSchema.set('toJSON', {
  transform(_doc, ret: Record<string, any>) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export const Execution = mongoose.model<IExecutionDocument>('Execution', executionSchema);
