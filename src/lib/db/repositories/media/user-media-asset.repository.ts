/**
 * User Media Asset Repository (Media)
 *
 * Manages metadata for profile pictures, avatars, and cover photos.
 * Binary assets reside in S3-compatible cloud storage / CDN.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IUserMediaAsset } from '../../types';
import { MediaAssetType, MediaAssetStatus } from '../../types/enums';
import { UserMediaAsset } from '../../models';
import { BaseRepository } from '../base.repository';

class UserMediaAssetRepositoryClass extends BaseRepository<IUserMediaAsset> {
  constructor() {
    super(UserMediaAsset);
  }

  /**
   * Find current active profile picture (avatar) for a user.
   */
  async findActiveAvatar(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<IUserMediaAsset | null> {
    const assets = await this.findMany(
      institutionId,
      {
        userId,
        assetType: MediaAssetType.PROFILE_PICTURE,
        status: MediaAssetStatus.ACTIVE,
      },
      { field: 'createdAt', order: 'desc' }
    );
    return assets[0] ?? null;
  }

  /**
   * Find all media assets uploaded by a user.
   */
  async findByUser(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    assetType?: MediaAssetType
  ): Promise<IUserMediaAsset[]> {
    const filter: Record<string, unknown> = { userId };
    if (assetType) {
      filter.assetType = assetType;
    }
    return this.findMany(institutionId, filter, { field: 'createdAt', order: 'desc' });
  }

  /**
   * Register pending media asset when a presigned upload URL is generated.
   */
  async initiateUpload(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      assetType: MediaAssetType;
      objectKey: string;
      fileName: string;
      declaredContentType: string;
      sizeBytes: number;
    },
    session?: ClientSession
  ): Promise<IUserMediaAsset> {
    return this.create(
      {
        institutionId,
        userId,
        assetType: data.assetType,
        objectKey: data.objectKey,
        fileName: data.fileName,
        declaredContentType: data.declaredContentType,
        sizeBytes: data.sizeBytes,
        status: MediaAssetStatus.PENDING_UPLOAD,
      },
      session
    );
  }

  /**
   * Mark media upload confirmed and active (e.g. after S3 upload completion).
   */
  async confirmUpload(
    institutionId: Types.ObjectId,
    assetId: Types.ObjectId,
    details: {
      cdnUrl: string;
      detectedContentType?: string;
      dimensions?: { width: number; height: number };
      variants?: Array<{ size: string; objectKey: string; width: number; height: number }>;
    },
    session?: ClientSession
  ): Promise<IUserMediaAsset | null> {
    return this.updateById(
      institutionId,
      assetId,
      {
        status: MediaAssetStatus.ACTIVE,
        cdnUrl: details.cdnUrl,
        detectedContentType: details.detectedContentType,
        dimensions: details.dimensions,
        variants: details.variants,
        uploadedAt: new Date(),
        processedAt: new Date(),
      },
      session
    );
  }

  /**
   * Mark previous avatars as replaced when user uploads a new active profile picture.
   */
  async deprecatePreviousAvatars(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    exceptAssetId: Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    return this.updateMany(
      institutionId,
      {
        userId,
        assetType: MediaAssetType.PROFILE_PICTURE,
        _id: { $ne: exceptAssetId },
        status: MediaAssetStatus.ACTIVE,
      },
      {
        status: MediaAssetStatus.REPLACED,
      },
      session
    );
  }
}

export const UserMediaAssetRepository = new UserMediaAssetRepositoryClass();
