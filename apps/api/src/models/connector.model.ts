import mongoose, { Document, Schema } from 'mongoose';
import type { ConnectorType, ConnectorStatus } from '@flowforge/shared';

export interface IConnectorDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  type: ConnectorType;
  name: string;
  accountLabel?: string;
  credentials: Record<string, string>;
  status: ConnectorStatus;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const connectorSchema = new Schema<IConnectorDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    type: {
      type: String,
      enum: [
        'google_calendar',
        'slack_message',
        'notion',
        'gmail',
        'google_drive',
        'send_email',
        'http_request',
      ],
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    accountLabel: { type: String, trim: true, maxlength: 200 },
    credentials: { type: Map, of: String, default: {} },
    status: {
      type: String,
      enum: ['connected', 'error', 'disconnected'],
      default: 'connected',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

connectorSchema.index({ workspaceId: 1, type: 1 });

connectorSchema.set('toJSON', {
  transform(_doc, ret: Record<string, unknown>) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    // Never leak credentials
    delete ret.credentials;
  },
});

export const Connector = mongoose.model<IConnectorDocument>('Connector', connectorSchema);
