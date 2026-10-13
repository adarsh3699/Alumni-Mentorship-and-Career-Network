/**
 * Placement Outcome Model (M10)
 * Imported from institutional sources — not inferred from mentoring.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IPlacementOutcome } from '../types';

const PlacementOutcomeSchema = new Schema<IPlacementOutcome>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    studentUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    outcomeType: { type: String, required: true, trim: true },
    occurredAt: { type: Date, required: true },
    sourceSystem: { type: String, required: true, trim: true },
    externalReference: { type: String, trim: true },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
PlacementOutcomeSchema.index({ institutionId: 1, studentUserId: 1, occurredAt: -1 });
PlacementOutcomeSchema.index({ institutionId: 1, sourceSystem: 1, externalReference: 1 });

export const PlacementOutcome: Model<IPlacementOutcome> =
  mongoose.models.PlacementOutcome ||
  mongoose.model<IPlacementOutcome>('PlacementOutcome', PlacementOutcomeSchema);
