/**
 * Institution Model
 * Core tenant scope entity.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IInstitution } from '../types';
import { InstitutionStatus } from '../types/enums';

const InstitutionSchema = new Schema<IInstitution>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(InstitutionStatus),
      default: InstitutionStatus.ACTIVE,
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
InstitutionSchema.index({ code: 1 }, { unique: true });

export const Institution: Model<IInstitution> =
  mongoose.models.Institution || mongoose.model<IInstitution>('Institution', InstitutionSchema);
