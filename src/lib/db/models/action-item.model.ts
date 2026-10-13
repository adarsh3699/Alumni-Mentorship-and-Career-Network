/**
 * Action Item Model (M7)
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IActionItem } from '../types';
import { ActionItemStatus } from '../types/enums';

const ActionItemSchema = new Schema<IActionItem>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    mentorshipId: { type: Schema.Types.ObjectId, required: true, ref: 'Mentorship' },
    goalId: { type: Schema.Types.ObjectId, required: true, ref: 'Goal' },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(ActionItemStatus),
      default: ActionItemStatus.PENDING,
    },
    dueDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
ActionItemSchema.index({ institutionId: 1, goalId: 1, status: 1 });
ActionItemSchema.index({ institutionId: 1, mentorshipId: 1, dueDate: 1 });

export const ActionItem: Model<IActionItem> =
  mongoose.models.ActionItem || mongoose.model<IActionItem>('ActionItem', ActionItemSchema);
