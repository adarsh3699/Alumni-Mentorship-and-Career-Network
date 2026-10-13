/**
 * Career Goal Model (M3)
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { ICareerGoal } from '../types';
import { CareerGoalStatus } from '../types/enums';

const CareerGoalSchema = new Schema<ICareerGoal>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    studentProfileId: { type: Schema.Types.ObjectId, required: true, ref: 'StudentProfile' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(CareerGoalStatus),
      default: CareerGoalStatus.NOT_STARTED,
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
CareerGoalSchema.index({ institutionId: 1, studentProfileId: 1, status: 1 });

export const CareerGoal: Model<ICareerGoal> =
  mongoose.models.CareerGoal || mongoose.model<ICareerGoal>('CareerGoal', CareerGoalSchema);
