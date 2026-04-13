import { Document, Schema, model } from 'mongoose';

export interface IBillingEventDocument extends Document {
  provider: 'stripe';
  eventId: string;
  eventType: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const billingEventSchema = new Schema<IBillingEventDocument>(
  {
    provider: { type: String, enum: ['stripe'], required: true },
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

billingEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const BillingEvent = model<IBillingEventDocument>('BillingEvent', billingEventSchema);
