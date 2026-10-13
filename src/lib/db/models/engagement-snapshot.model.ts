/**
 * Engagement Snapshot Model (M8)
 * Time-series assessment of mentorship health.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IEngagementSnapshot } from '../types';
import { EngagementStatus } from '../types/enums';

const EngagementSnapshotSchema = new Schema<IEngagementSnapshot>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    mentorshipId: { type: Schema.Types.ObjectId, required: true, ref: 'Mentorship' },
    status: {
      type: String,
      required: true,
      enum: Object.values(EngagementStatus),
    },
    lastMeaningfulActivityAt: { type: Date },
    assessedAt: { type: Date, required: true, default: Date.now },
    criteriaVersion: { type: String },
    nudgeIssuedAt: { type: Date },
  },
  { timestamps: false }
);

// ── Indexes ────────────────────────────────────────────────────────────
EngagementSnapshotSchema.index({ institutionId: 1, mentorshipId: 1, assessedAt: -1 });

export const EngagementSnapshot: Model<IEngagementSnapshot> =
  mongoose.models.EngagementSnapshot ||
  mongoose.model<IEngagementSnapshot>('EngagementSnapshot', EngagementSnapshotSchema);
