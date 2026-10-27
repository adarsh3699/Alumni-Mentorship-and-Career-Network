/**
 * Verification Document Model (M1)
 * Metadata for verification evidence stored in object storage.
 * Binaries are NEVER stored in MongoDB.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IVerificationDocument } from '../types';
import { VerificationDocumentStatus } from '../types/enums';

const VerificationDocumentSchema = new Schema<IVerificationDocument>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    verificationRequestId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'VerificationRequest',
    },
    url: { type: String, trim: true },
    secureUrl: { type: String, trim: true },
    publicId: { type: String, trim: true },
    objectKey: { type: String, trim: true },
    fileName: { type: String, required: true, trim: true },
    declaredContentType: { type: String, required: true },
    detectedContentType: { type: String },
    sizeBytes: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(VerificationDocumentStatus),
      default: VerificationDocumentStatus.PENDING_UPLOAD,
    },
    validationMessage: { type: String, trim: true },
    uploadedAt: { type: Date },
    validatedAt: { type: Date },
    scannedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
VerificationDocumentSchema.index({
  institutionId: 1,
  verificationRequestId: 1,
  status: 1,
});

export const VerificationDocument: Model<IVerificationDocument> =
  mongoose.models.VerificationDocument ||
  mongoose.model<IVerificationDocument>('VerificationDocument', VerificationDocumentSchema);
