import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLogDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  resourceType: string;
  resourceId: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ workspaceId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
