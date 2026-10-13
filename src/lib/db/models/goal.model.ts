/**
 * Goal Model (M7)
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IGoal } from '../types';
import { GoalStatus } from '../types/enums';

const GoalSchema = new Schema<IGoal>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    mentorshipId: { type: Schema.Types.ObjectId, required: true, ref: 'Mentorship' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(GoalStatus),
      default: GoalStatus.NOT_STARTED,
    },
    dueDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
GoalSchema.index({ institutionId: 1, mentorshipId: 1, status: 1 });

export const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);
