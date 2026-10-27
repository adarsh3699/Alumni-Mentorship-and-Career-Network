/**
 * User Model
 * Authenticated identity and role.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IUser } from '../types';
import { UserRole, UserStatus } from '../types/enums';

const UserSchema = new Schema<IUser>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    externalIdentityId: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: Object.values(UserRole),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    avatarUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
UserSchema.index({ institutionId: 1, externalIdentityId: 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
