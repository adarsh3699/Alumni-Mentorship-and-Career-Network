/**
 * User Media Asset Repository (Media)
 *
 * Manages metadata for profile pictures, avatars, and cover photos.
 * Media binaries reside in Cloudinary; URLs, public IDs, and transformation metadata are stored in MongoDB.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IUserMediaAsset, ImageVariant } from '../../types';
import { MediaAssetType, MediaAssetStatus } from '../../types/enums';
import { UserMediaAsset, User, Alumnus, StudentProfile } from '../../models';
import { BaseRepository } from '../base.repository';

export interface SaveCloudinaryAssetInput {
  assetType: MediaAssetType;
  url: string;
  secureUrl?: string;
  publicId: string;
  format?: string;
  resourceType?: string;
  folder?: string;
  fileName: string;
  declaredContentType?: string;
  detectedContentType?: string;
  sizeBytes: number;
  dimensions?: { width: number; height: number };
  thumbnailUrl?: string;
  variants?: ImageVariant[];
  objectKey?: string;
}

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
   * Find media asset by Cloudinary publicId within an institution.
   */
  async findByPublicId(
    institutionId: Types.ObjectId,
    publicId: string
  ): Promise<IUserMediaAsset | null> {
    return this.findOne(institutionId, { publicId });
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
   * Save a completed Cloudinary upload into MongoDB and activate it.
   * If saving a profile picture, automatically:
   * 1. Marks previous avatars as REPLACED.
   * 2. Synchronizes the avatar URL directly onto User, Alumnus, and StudentProfile documents.
   */
  async saveCloudinaryAsset(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    data: SaveCloudinaryAssetInput,
    session?: ClientSession
  ): Promise<IUserMediaAsset> {
    const declaredType = data.declaredContentType || (data.format ? `image/${data.format}` : 'image/jpeg');

    const asset = await this.create(
      {
        institutionId,
        userId,
        assetType: data.assetType,
        url: data.url,
        secureUrl: data.secureUrl || data.url,
        publicId: data.publicId,
        format: data.format,
        resourceType: data.resourceType || 'image',
        folder: data.folder,
        thumbnailUrl: data.thumbnailUrl,
        objectKey: data.objectKey || data.publicId,
        cdnUrl: data.secureUrl || data.url,
        fileName: data.fileName,
        declaredContentType: declaredType,
        detectedContentType: data.detectedContentType || declaredType,
        sizeBytes: data.sizeBytes,
        dimensions: data.dimensions,
        status: MediaAssetStatus.ACTIVE,
        variants: data.variants || [],
        uploadedAt: new Date(),
        processedAt: new Date(),
      },
      session
    );

    // If avatar, archive older ones and propagate avatarUrl for rapid 0-join queries
    if (data.assetType === MediaAssetType.PROFILE_PICTURE) {
      await this.deprecatePreviousAvatars(institutionId, userId, asset._id, session);

      const avatarUrl = data.secureUrl || data.url;

      await Promise.all([
        User.updateOne(
          { institutionId, _id: userId },
          { $set: { avatarUrl } },
          { session }
        ).exec(),
        Alumnus.updateOne(
          { institutionId, userId },
          { $set: { avatarUrl } },
          { session }
        ).exec(),
        StudentProfile.updateOne(
          { institutionId, userId },
          { $set: { avatarUrl } },
          { session }
        ).exec(),
      ]);
    }

    return asset;
  }

  /**
   * Register pending media asset before direct upload to Cloudinary.
   */
  async initiateUpload(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      assetType: MediaAssetType;
      publicId?: string;
      objectKey?: string;
      url?: string;
      fileName: string;
      declaredContentType: string;
      sizeBytes: number;
      folder?: string;
    },
    session?: ClientSession
  ): Promise<IUserMediaAsset> {
    const publicId = data.publicId || data.objectKey || `temp_${Date.now()}`;
    const url = data.url || '';

    return this.create(
      {
        institutionId,
        userId,
        assetType: data.assetType,
        url,
        publicId,
        objectKey: data.objectKey || publicId,
        folder: data.folder,
        fileName: data.fileName,
        declaredContentType: data.declaredContentType,
        sizeBytes: data.sizeBytes,
        status: MediaAssetStatus.PENDING_UPLOAD,
      },
      session
    );
  }

  /**
   * Mark media upload confirmed and active after Cloudinary upload finishes.
   */
  async confirmUpload(
    institutionId: Types.ObjectId,
    assetId: Types.ObjectId,
    details: {
      url: string;
      secureUrl?: string;
      publicId?: string;
      cdnUrl?: string;
      format?: string;
      thumbnailUrl?: string;
      detectedContentType?: string;
      dimensions?: { width: number; height: number };
      variants?: ImageVariant[];
    },
    session?: ClientSession
  ): Promise<IUserMediaAsset | null> {
    const asset = await this.updateById(
      institutionId,
      assetId,
      {
        status: MediaAssetStatus.ACTIVE,
        url: details.url,
        secureUrl: details.secureUrl || details.url,
        cdnUrl: details.cdnUrl || details.secureUrl || details.url,
        publicId: details.publicId,
        format: details.format,
        thumbnailUrl: details.thumbnailUrl,
        detectedContentType: details.detectedContentType,
        dimensions: details.dimensions,
        variants: details.variants,
        uploadedAt: new Date(),
        processedAt: new Date(),
      },
      session
    );

    if (asset && asset.assetType === MediaAssetType.PROFILE_PICTURE) {
      await this.deprecatePreviousAvatars(institutionId, asset.userId, asset._id, session);

      const avatarUrl = details.secureUrl || details.url;
      await Promise.all([
        User.updateOne(
          { institutionId, _id: asset.userId },
          { $set: { avatarUrl } },
          { session }
        ).exec(),
        Alumnus.updateOne(
          { institutionId, userId: asset.userId },
          { $set: { avatarUrl } },
          { session }
        ).exec(),
        StudentProfile.updateOne(
          { institutionId, userId: asset.userId },
          { $set: { avatarUrl } },
          { session }
        ).exec(),
      ]);
    }

    return asset;
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
