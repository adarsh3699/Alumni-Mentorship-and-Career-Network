/**
 * Programme Configuration Model (M10)
 * Institution-scoped, versioned administrative policies.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IProgrammeConfiguration } from '../types';

const ProgrammeConfigurationSchema = new Schema<IProgrammeConfiguration>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    version: { type: Number, required: true },
    matchingWeights: { type: Schema.Types.Mixed, required: true },
    requestPolicy: { type: Schema.Types.Mixed, required: true },
    engagementSettings: { type: Schema.Types.Mixed, required: true },
    effectiveFrom: { type: Date, required: true },
    updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
ProgrammeConfigurationSchema.index({ institutionId: 1, version: 1 }, { unique: true });
ProgrammeConfigurationSchema.index({ institutionId: 1, effectiveFrom: -1 });

export const ProgrammeConfiguration: Model<IProgrammeConfiguration> =
  mongoose.models.ProgrammeConfiguration ||
  mongoose.model<IProgrammeConfiguration>(
    'ProgrammeConfiguration',
    ProgrammeConfigurationSchema
  );
