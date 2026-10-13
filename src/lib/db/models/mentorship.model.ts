/**
 * Mentorship Model (M5)
 * Active mentoring relationship. Creation must be idempotent.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IMentorship } from '../types';
import { MentorshipStatus } from '../types/enums';

const MentorshipSchema = new Schema<IMentorship>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    studentUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    mentorAlumnusId: { type: Schema.Types.ObjectId, required: true, ref: 'Alumnus' },
    sourceRequestId: { type: Schema.Types.ObjectId, required: true, ref: 'MentorshipRequest' },
    status: {
      type: String,
      required: true,
      enum: Object.values(MentorshipStatus),
      default: MentorshipStatus.ACTIVE,
    },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
MentorshipSchema.index({ institutionId: 1, mentorAlumnusId: 1, status: 1 });
MentorshipSchema.index({ institutionId: 1, studentUserId: 1, status: 1 });
MentorshipSchema.index({ institutionId: 1, sourceRequestId: 1 }, { unique: true });

export const Mentorship: Model<IMentorship> =
  mongoose.models.Mentorship || mongoose.model<IMentorship>('Mentorship', MentorshipSchema);
