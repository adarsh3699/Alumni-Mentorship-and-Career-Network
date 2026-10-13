/**
 * Mentorship Request Model (M5)
 * Lifecycle: pending → accepted | declined | expired
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IMentorshipRequest } from '../types';
import { MentorshipRequestStatus } from '../types/enums';

const MentorshipRequestSchema = new Schema<IMentorshipRequest>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    studentUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    mentorAlumnusId: { type: Schema.Types.ObjectId, required: true, ref: 'Alumnus' },
    status: {
      type: String,
      required: true,
      enum: Object.values(MentorshipRequestStatus),
      default: MentorshipRequestStatus.PENDING,
    },
    message: { type: String, trim: true },
    declineReason: { type: String, trim: true },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date },
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
MentorshipRequestSchema.index({
  institutionId: 1,
  mentorAlumnusId: 1,
  status: 1,
  createdAt: -1,
});
MentorshipRequestSchema.index({
  institutionId: 1,
  studentUserId: 1,
  status: 1,
  createdAt: -1,
});
MentorshipRequestSchema.index({ institutionId: 1, status: 1, expiresAt: 1 });

export const MentorshipRequest: Model<IMentorshipRequest> =
  mongoose.models.MentorshipRequest ||
  mongoose.model<IMentorshipRequest>('MentorshipRequest', MentorshipRequestSchema);
