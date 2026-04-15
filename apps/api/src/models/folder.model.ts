import mongoose, { Document, Schema } from 'mongoose';
import { RoleType } from '@flowforge/shared';

export interface IFolderDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  color: string;
  accessControl: {
    minViewRole: RoleType;
    minEditRole: RoleType;
    minExecuteRole: RoleType;
  };
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolderDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '', maxlength: 500 },
    color: { type: String, default: '#3b82f6' },
    accessControl: {
      minViewRole: {
        type: String,
        enum: ['owner', 'admin', 'editor', 'viewer'],
        default: 'viewer',
      },
      minEditRole: {
        type: String,
        enum: ['owner', 'admin', 'editor', 'viewer'],
        default: 'editor',
      },
      minExecuteRole: {
        type: String,
        enum: ['owner', 'admin', 'editor', 'viewer'],
        default: 'editor',
      },
    },
  },
  { timestamps: true },
);

folderSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
folderSchema.index({ workspaceId: 1, name: 1 });

folderSchema.set('toJSON', {
  transform(_doc, ret: Record<string, any>) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

export const Folder = mongoose.model<IFolderDocument>('Folder', folderSchema);
