/**
 * Career Asset Model
 * Video CVs, resumes, portfolio items. Binaries stored on Cloudinary;
 * URLs, streaming metadata, and thumbnails stored in MongoDB.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { ICareerAsset } from '../types';
import { CareerAssetType, CareerAssetStatus } from '../types/enums';

const VideoMetaSchema = new Schema(
  {
    duration: { type: Number, required: true },
    resolution: { type: String, required: true },
    thumbnailUrl: { type: String, trim: true },
    playbackUrl: { type: String, trim: true },
    thumbnailKey: { type: String, trim: true },
    transcodedKey: { type: String, trim: true },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const CareerAssetSchema = new Schema<ICareerAsset>(
  {
    institutionId: { type: Schema.Types.ObjectId, required: true, ref: 'Institution', index: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    assetType: {
      type: String,
      required: true,
      enum: Object.values(CareerAssetType),
    },
    url: { type: String, required: true, trim: true },
    secureUrl: { type: String, trim: true },
    publicId: { type: String, required: true, trim: true, index: true },
    format: { type: String, trim: true },
    resourceType: { type: String, default: 'video' },
    folder: { type: String, trim: true },
    objectKey: { type: String, trim: true },
    fileName: { type: String, required: true, trim: true },
    declaredContentType: { type: String, required: true },
    detectedContentType: { type: String },
    sizeBytes: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(CareerAssetStatus),
      default: CareerAssetStatus.PENDING_UPLOAD,
    },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    videoMeta: VideoMetaSchema,
    validationMessage: { type: String, trim: true },
    uploadedAt: { type: Date },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
CareerAssetSchema.index({ institutionId: 1, userId: 1, assetType: 1, status: 1 });
CareerAssetSchema.index({ publicId: 1 });
CareerAssetSchema.index({ institutionId: 1, assetType: 1, createdAt: -1 });

export const CareerAsset: Model<ICareerAsset> =
  mongoose.models.CareerAsset || mongoose.model<ICareerAsset>('CareerAsset', CareerAssetSchema);
