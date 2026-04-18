import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IInvitation extends Document {
  workspaceId: mongoose.Types.ObjectId;
  email: string;
  role: string;
  invitedBy: mongoose.Types.ObjectId;
  token: string;
  status: 'pending' | 'accepted' | 'declined';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'editor' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

invitationSchema.index({ workspaceId: 1, email: 1 });
invitationSchema.index({ token: 1 }, { unique: true });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

invitationSchema.statics.generateToken = function (): string {
  return crypto.randomBytes(32).toString('hex');
};

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);
