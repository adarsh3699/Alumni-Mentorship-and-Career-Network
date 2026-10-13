/**
 * Outbox Event Model (Cross-cutting)
 * Durable asynchronous event dispatch. Idempotent via deduplicationKey.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IOutboxEvent } from '../types';
import { OutboxEventStatus } from '../types/enums';

const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    eventType: { type: String, required: true, trim: true },
    aggregateType: { type: String, required: true, trim: true },
    aggregateId: { type: Schema.Types.ObjectId, required: true },
    deduplicationKey: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(OutboxEventStatus),
      default: OutboxEventStatus.PENDING,
    },
    availableAt: { type: Date, required: true, default: Date.now },
    attempts: { type: Number, required: true, default: 0 },
    lastError: { type: String },
    dispatchedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
OutboxEventSchema.index({ institutionId: 1, deduplicationKey: 1 }, { unique: true });
OutboxEventSchema.index({ institutionId: 1, status: 1, availableAt: 1 });

export const OutboxEvent: Model<IOutboxEvent> =
  mongoose.models.OutboxEvent || mongoose.model<IOutboxEvent>('OutboxEvent', OutboxEventSchema);
