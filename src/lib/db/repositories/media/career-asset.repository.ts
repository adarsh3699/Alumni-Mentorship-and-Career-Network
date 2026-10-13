/**
 * Career Asset Repository (Media)
 *
 * Manages metadata for video CVs, resumes, portfolios, and pitch decks.
 * Stores duration, transcoding tokens, thumbnail pointers, and validation status.
 */

import type { Types, ClientSession } from 'mongoose';
import type { ICareerAsset } from '../../types';
import { CareerAssetType, CareerAssetStatus } from '../../types/enums';
import { CareerAsset } from '../../models';
import { BaseRepository } from '../base.repository';

class CareerAssetRepositoryClass extends BaseRepository<ICareerAsset> {
  constructor() {
    super(CareerAsset);
  }

  /**
   * Find user's active video CV.
   */
  async findActiveVideoCV(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ICareerAsset | null> {
    const assets = await this.findMany(
      institutionId,
      {
        userId,
        assetType: CareerAssetType.VIDEO_CV,
        status: CareerAssetStatus.ACTIVE,
      },
      { field: 'createdAt', order: 'desc' }
    );
    return assets[0] ?? null;
  }

  /**
   * Find user's active primary resume document.
   */
  async findActiveResume(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ICareerAsset | null> {
    const assets = await this.findMany(
      institutionId,
      {
        userId,
        assetType: CareerAssetType.RESUME,
        status: CareerAssetStatus.ACTIVE,
      },
      { field: 'createdAt', order: 'desc' }
    );
    return assets[0] ?? null;
  }

  /**
   * Find all career assets for a user (video CVs, portfolio links, resumes).
   */
  async findByUser(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    assetType?: CareerAssetType
  ): Promise<ICareerAsset[]> {
    const filter: Record<string, unknown> = { userId };
    if (assetType) {
      filter.assetType = assetType;
    }
    return this.findMany(institutionId, filter, { field: 'createdAt', order: 'desc' });
  }

  /**
   * Initiate upload metadata when a presigned URL is requested.
   */
  async initiateUpload(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      assetType: CareerAssetType;
      objectKey: string;
      fileName: string;
      declaredContentType: string;
      sizeBytes: number;
      title?: string;
      description?: string;
    },
    session?: ClientSession
  ): Promise<ICareerAsset> {
    return this.create(
      {
        institutionId,
        userId,
        assetType: data.assetType,
        objectKey: data.objectKey,
        fileName: data.fileName,
        declaredContentType: data.declaredContentType,
        sizeBytes: data.sizeBytes,
        title: data.title,
        description: data.description,
        status: CareerAssetStatus.PENDING_UPLOAD,
      },
      session
    );
  }

  /**
   * Confirm upload and activate the career asset.
   */
  async confirmUpload(
    institutionId: Types.ObjectId,
    assetId: Types.ObjectId,
    detectedContentType?: string,
    session?: ClientSession
  ): Promise<ICareerAsset | null> {
    return this.updateById(
      institutionId,
      assetId,
      {
        status: CareerAssetStatus.ACTIVE,
        detectedContentType,
        uploadedAt: new Date(),
        processedAt: new Date(),
      },
      session
    );
  }

  /**
   * Update video metadata after video processing / HLS transcoding job completes.
   */
  async updateVideoTranscoding(
    institutionId: Types.ObjectId,
    assetId: Types.ObjectId,
    videoMeta: {
      duration: number;
      resolution: string;
      thumbnailKey?: string;
      transcodedKey?: string;
    },
    status: CareerAssetStatus = CareerAssetStatus.ACTIVE,
    session?: ClientSession
  ): Promise<ICareerAsset | null> {
    return this.updateById(
      institutionId,
      assetId,
      {
        videoMeta,
        status,
        processedAt: new Date(),
      },
      session
    );
  }
}

export const CareerAssetRepository = new CareerAssetRepositoryClass();
