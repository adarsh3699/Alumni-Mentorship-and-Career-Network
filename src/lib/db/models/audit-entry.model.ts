/**
 * Audit Entry Model (Cross-cutting)
 * Append-only, must not contain unnecessary PII.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IAuditEntry } from '../types';

const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    actorUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: false }
);

// ── Indexes ────────────────────────────────────────────────────────────
AuditEntrySchema.index({ institutionId: 1, targetType: 1, targetId: 1, timestamp: -1 });
AuditEntrySchema.index({ institutionId: 1, actorUserId: 1, timestamp: -1 });

export const AuditEntry: Model<IAuditEntry> =
  mongoose.models.AuditEntry || mongoose.model<IAuditEntry>('AuditEntry', AuditEntrySchema);
