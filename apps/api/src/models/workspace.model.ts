import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IWorkspaceMember {
  userId: mongoose.Types.ObjectId;
  role: string;
  joinedAt: Date;
}

export interface IWorkspaceDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  members: IWorkspaceMember[];
  settings: {
    defaultTimezone: string;
    webhookSecret: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspaceDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: {
          type: String,
          enum: ['owner', 'admin', 'editor', 'viewer'],
          required: true,
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    settings: {
      defaultTimezone: { type: String, default: 'UTC' },
      webhookSecret: { type: String, default: () => uuidv4() },
    },
  },
  { timestamps: true },
);

workspaceSchema.index({ 'members.userId': 1 });

workspaceSchema.set('toJSON', {
  transform(_doc, ret: Record<string, any>) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export const Workspace = mongoose.model<IWorkspaceDocument>('Workspace', workspaceSchema);
