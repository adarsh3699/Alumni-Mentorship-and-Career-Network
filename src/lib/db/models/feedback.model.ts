/**
 * Feedback Model (M7)
 * Historical submission — never silently overwritten.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IFeedback } from '../types';
import { UserRole } from '../types/enums';

const FeedbackSchema = new Schema<IFeedback>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    mentorshipId: { type: Schema.Types.ObjectId, required: true, ref: 'Mentorship' },
    submittedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    submittedByRole: {
      type: String,
      required: true,
      enum: Object.values(UserRole),
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comments: { type: String, trim: true },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

// ── Indexes ────────────────────────────────────────────────────────────
FeedbackSchema.index({ institutionId: 1, mentorshipId: 1, submittedAt: -1 });

export const Feedback: Model<IFeedback> =
  mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
