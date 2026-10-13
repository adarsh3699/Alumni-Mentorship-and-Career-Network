/**
 * Message Model (M9)
 * Relationship-scoped messaging. Does NOT expose mentor private contact info.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IMessage } from '../types';
import { UserRole } from '../types/enums';

const MessageSchema = new Schema<IMessage>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    mentorshipId: { type: Schema.Types.ObjectId, required: true, ref: 'Mentorship' },
    senderUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    senderRole: {
      type: String,
      required: true,
      enum: Object.values(UserRole),
    },
    message: { type: String, required: true },
    sentAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

// ── Indexes ────────────────────────────────────────────────────────────
MessageSchema.index({ institutionId: 1, mentorshipId: 1, sentAt: -1 });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
