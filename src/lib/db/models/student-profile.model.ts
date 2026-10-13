/**
 * Student Profile Model (M3)
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IStudentProfile } from '../types';

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    interests: [{ type: String, trim: true }],
    targetRoles: [{ type: String, trim: true }],
    targetIndustries: [{ type: String, trim: true }],
    graduationYear: { type: Number },
    major: { type: String, trim: true },
    degree: { type: String, trim: true },
    gpa: { type: Number },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
StudentProfileSchema.index({ institutionId: 1, userId: 1 }, { unique: true });

export const StudentProfile: Model<IStudentProfile> =
  mongoose.models.StudentProfile ||
  mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
