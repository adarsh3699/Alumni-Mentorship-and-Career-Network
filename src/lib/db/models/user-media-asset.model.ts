/**
 * User Media Asset Model
 * Profile pictures and cover photos. Binaries stored in object storage.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IUserMediaAsset } from '../types';
import { MediaAssetType, MediaAssetStatus } from '../types/enums';

const ImageVariantSchema = new Schema(
  {
    size: { type: String, required: true },
    objectKey: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false }
);

const UserMediaAssetSchema = new Schema<IUserMediaAsset>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    assetType: {
      type: String,
      required: true,
      enum: Object.values(MediaAssetType),
    },
    objectKey: { type: String, required: true },
    cdnUrl: { type: String },
    fileName: { type: String, required: true, trim: true },
    declaredContentType: { type: String, required: true },
    detectedContentType: { type: String },
    sizeBytes: { type: Number, required: true },
    dimensions: {
      width: { type: Number },
      height: { type: Number },
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(MediaAssetStatus),
      default: MediaAssetStatus.PENDING_UPLOAD,
    },
    variants: [ImageVariantSchema],
    uploadedAt: { type: Date },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
UserMediaAssetSchema.index({ institutionId: 1, userId: 1, assetType: 1, status: 1 });

export const UserMediaAsset: Model<IUserMediaAsset> =
  mongoose.models.UserMediaAsset ||
  mongoose.model<IUserMediaAsset>('UserMediaAsset', UserMediaAssetSchema);
