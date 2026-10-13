/**
 * Expertise Tag Model (M1)
 * Institution-scoped expertise taxonomy.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IExpertiseTag } from '../types';
import { ExpertiseTagStatus } from '../types/enums';

const ExpertiseTagSchema = new Schema<IExpertiseTag>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(ExpertiseTagStatus),
      default: ExpertiseTagStatus.ACTIVE,
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
ExpertiseTagSchema.index({ institutionId: 1, name: 1 }, { unique: true });

export const ExpertiseTag: Model<IExpertiseTag> =
  mongoose.models.ExpertiseTag ||
  mongoose.model<IExpertiseTag>('ExpertiseTag', ExpertiseTagSchema);
