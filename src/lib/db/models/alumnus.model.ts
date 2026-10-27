/**
 * Alumnus Model (M1)
 * Alumni/mentor profile. email and phone are RESTRICTED fields.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IAlumnus } from '../types';
import { VerificationStatus } from '../types/enums';

const AlumnusSchema = new Schema<IAlumnus>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    verificationStatus: {
      type: String,
      required: true,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
    expertiseTagIds: [{ type: Schema.Types.ObjectId, ref: 'ExpertiseTag' }],
    mentoringInterests: [{ type: String, trim: true }],
    displayName: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    professionalHeadline: { type: String, trim: true },
    currentRole: { type: String, trim: true },
    currentTitle: { type: String, trim: true },
    currentCompany: { type: String, trim: true },
    industry: { type: String, trim: true },
    degree: { type: String, trim: true },
    major: { type: String, trim: true },
    bio: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    expertise: [{ type: String, trim: true }],
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    graduationYear: { type: Number },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
AlumnusSchema.index({ institutionId: 1, userId: 1 }, { unique: true });
AlumnusSchema.index({ institutionId: 1, verificationStatus: 1 });
AlumnusSchema.index({ institutionId: 1, expertiseTagIds: 1 });

/**
 * Student-safe projection — EXCLUDES restricted PII fields.
 * Use this for any student-facing query to prevent data leakage.
 */
export const ALUMNUS_STUDENT_SAFE_PROJECTION = {
  email: 0,
  phone: 0,
} as const;

export const Alumnus: Model<IAlumnus> =
  mongoose.models.Alumnus || mongoose.model<IAlumnus>('Alumnus', AlumnusSchema);
