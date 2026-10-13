/**
 * Mentor Capacity Model (M2)
 * Concurrency-critical — activeMentees is protected by atomic conditional update.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IMentorCapacity } from '../types';

const MentorCapacitySchema = new Schema<IMentorCapacity>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    alumnusId: { type: Schema.Types.ObjectId, required: true, ref: 'Alumnus' },
    maxConcurrentMentees: { type: Number, required: true, min: 0 },
    activeMentees: { type: Number, required: true, min: 0, default: 0 },
    acceptingNewMentees: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// ── Indexes ────────────────────────────────────────────────────────────
MentorCapacitySchema.index({ institutionId: 1, alumnusId: 1 }, { unique: true });

/**
 * Pre-validate: ensure activeMentees never exceeds maxConcurrentMentees.
 * This is a safety net — the real protection is the atomic conditional update
 * in the repository layer.
 */
MentorCapacitySchema.pre('validate', function () {
  if (this.activeMentees > this.maxConcurrentMentees) {
    throw new Error('activeMentees cannot exceed maxConcurrentMentees');
  }
});

export const MentorCapacity: Model<IMentorCapacity> =
  mongoose.models.MentorCapacity ||
  mongoose.model<IMentorCapacity>('MentorCapacity', MentorCapacitySchema);
