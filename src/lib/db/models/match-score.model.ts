/**
 * Match Score Model (M4)
 * Derived snapshot of matching results — not the authority for eligibility/capacity.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IMatchScore } from '../types';

const MatchScoreSchema = new Schema<IMatchScore>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    studentProfileId: { type: Schema.Types.ObjectId, required: true, ref: 'StudentProfile' },
    alumnusId: { type: Schema.Types.ObjectId, required: true, ref: 'Alumnus' },
    score: { type: Number, required: true },
    rank: { type: Number, required: true },
    reasons: [{ type: String, required: true }],
    generatedAt: { type: Date, required: true, default: Date.now },
    matchingVersion: { type: String },
  },
  { timestamps: false }
);

// ── Indexes ────────────────────────────────────────────────────────────
MatchScoreSchema.index({ institutionId: 1, studentProfileId: 1, rank: 1 });
MatchScoreSchema.index({ institutionId: 1, alumnusId: 1, generatedAt: -1 });

export const MatchScore: Model<IMatchScore> =
  mongoose.models.MatchScore || mongoose.model<IMatchScore>('MatchScore', MatchScoreSchema);
