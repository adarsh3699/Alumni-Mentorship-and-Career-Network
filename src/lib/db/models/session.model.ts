/**
 * Session Model (M6)
 * Lifecycle: proposed → scheduled → completed | cancelled
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { ISession } from '../types';
import { SessionStatus, CalendarProvider } from '../types/enums';

const SessionSchema = new Schema<ISession>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    mentorshipId: { type: Schema.Types.ObjectId, required: true, ref: 'Mentorship' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    timezone: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(SessionStatus),
      default: SessionStatus.PROPOSED,
    },
    calendarProvider: {
      type: String,
      required: true,
      enum: Object.values(CalendarProvider),
      default: CalendarProvider.NONE,
    },
    calendarEventId: { type: String },
    meetingUrl: { type: String },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
SessionSchema.index({ institutionId: 1, mentorshipId: 1, startAt: 1 });

// ── Validation ─────────────────────────────────────────────────────────
SessionSchema.pre('validate', function () {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    throw new Error('startAt must be before endAt');
  }
});

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
