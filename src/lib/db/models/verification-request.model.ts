/**
 * Verification Request Model (M1)
 * Verification lifecycle tracking.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IVerificationRequest } from '../types';
import { VerificationStatus } from '../types/enums';

const VerificationRequestSchema = new Schema<IVerificationRequest>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    alumnusId: { type: Schema.Types.ObjectId, required: true, ref: 'Alumnus' },
    institutionalIdentifier: { type: String, required: true, trim: true },
    graduationYear: { type: Number },
    status: {
      type: String,
      required: true,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
    submittedAt: { type: Date, required: true, default: Date.now },
    decidedAt: { type: Date },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
    documents: [{ type: Schema.Types.ObjectId, ref: 'VerificationDocument' }],
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
VerificationRequestSchema.index({ institutionId: 1, status: 1, submittedAt: -1 });
VerificationRequestSchema.index({ institutionId: 1, alumnusId: 1, submittedAt: -1 });

export const VerificationRequest: Model<IVerificationRequest> =
  mongoose.models.VerificationRequest ||
  mongoose.model<IVerificationRequest>('VerificationRequest', VerificationRequestSchema);
