/**
 * Availability Window Model (M2)
 * Mentor availability time periods.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IAvailabilityWindow } from '../types';

const AvailabilityWindowSchema = new Schema<IAvailabilityWindow>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    alumnusId: { type: Schema.Types.ObjectId, required: true, ref: 'Alumnus' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    timezone: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
AvailabilityWindowSchema.index({ institutionId: 1, alumnusId: 1, startAt: 1 });

// ── Validation ─────────────────────────────────────────────────────────
AvailabilityWindowSchema.pre('validate', function () {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    throw new Error('startAt must be before endAt');
  }
});

export const AvailabilityWindow: Model<IAvailabilityWindow> =
  mongoose.models.AvailabilityWindow ||
  mongoose.model<IAvailabilityWindow>('AvailabilityWindow', AvailabilityWindowSchema);
