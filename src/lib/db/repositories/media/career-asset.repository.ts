/**
 * Career Asset Repository (Media)
 *
 * Manages metadata for video CVs, resumes, portfolios, and pitch decks.
 * Media binaries reside in Cloudinary; URLs, duration, auto-thumbnails,
 * and streaming playback pointers are stored in MongoDB.
 */

import type { Types, ClientSession } from 'mongoose';
import type { ICareerAsset, VideoMeta } from '../../types';
import { CareerAssetType, CareerAssetStatus } from '../../types/enums';
import { CareerAsset, StudentProfile } from '../../models';
import { BaseRepository } from '../base.repository';

export interface SaveCloudinaryVideoInput {
  url: string;
  secureUrl?: string;
  publicId: string;
  format?: string;
  folder?: string;
  fileName: string;
  sizeBytes: number;
  title?: string;
  description?: string;
  videoMeta: VideoMeta;
}

export interface SaveCloudinaryResumeInput {
  url: string;
  secureUrl?: string;
  publicId: string;
  format?: string;
  folder?: string;
  fileName: string;
  sizeBytes: number;
  title?: string;
  description?: string;
}

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
   * Find career asset by Cloudinary publicId.
   */
  async findByPublicId(
    institutionId: Types.ObjectId,
    publicId: string
  ): Promise<ICareerAsset | null> {
    return this.findOne(institutionId, { publicId });
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
   * Save an uploaded Cloudinary Video CV into MongoDB and synchronize its URL to the student profile.
   */
  async saveCloudinaryVideoCV(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    data: SaveCloudinaryVideoInput,
    session?: ClientSession
  ): Promise<ICareerAsset> {
    const videoUrl = data.secureUrl || data.url;

    const asset = await this.create(
      {
        institutionId,
        userId,
        assetType: CareerAssetType.VIDEO_CV,
        url: videoUrl,
        secureUrl: videoUrl,
        publicId: data.publicId,
        format: data.format || 'mp4',
        resourceType: 'video',
        folder: data.folder,
        objectKey: data.publicId,
        fileName: data.fileName,
        declaredContentType: 'video/mp4',
        detectedContentType: 'video/mp4',
        sizeBytes: data.sizeBytes,
        status: CareerAssetStatus.ACTIVE,
        title: data.title || 'Video CV Pitch',
        description: data.description,
        videoMeta: data.videoMeta,
        uploadedAt: new Date(),
        processedAt: new Date(),
      },
      session
    );

    // Propagate video CV URL directly onto student profile
    await StudentProfile.updateOne(
      { institutionId, userId },
      { $set: { videoCvUrl: videoUrl } },
      { session }
    ).exec();

    return asset;
  }

  /**
   * Save an uploaded Cloudinary Resume document (PDF/DOCX) into MongoDB and synchronize its URL.
   */
  async saveCloudinaryResume(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    data: SaveCloudinaryResumeInput,
    session?: ClientSession
  ): Promise<ICareerAsset> {
    const docUrl = data.secureUrl || data.url;

    const asset = await this.create(
      {
        institutionId,
        userId,
        assetType: CareerAssetType.RESUME,
        url: docUrl,
        secureUrl: docUrl,
        publicId: data.publicId,
        format: data.format || 'pdf',
        resourceType: 'raw',
        folder: data.folder,
        objectKey: data.publicId,
        fileName: data.fileName,
        declaredContentType: 'application/pdf',
        detectedContentType: 'application/pdf',
        sizeBytes: data.sizeBytes,
        status: CareerAssetStatus.ACTIVE,
        title: data.title || 'Primary Resume',
        description: data.description,
        uploadedAt: new Date(),
        processedAt: new Date(),
      },
      session
    );

    // Propagate resume URL directly onto student profile
    await StudentProfile.updateOne(
      { institutionId, userId },
      { $set: { resumeUrl: docUrl } },
      { session }
    ).exec();

    return asset;
  }

  /**
   * Initiate upload metadata before client-side direct upload.
   */
  async initiateUpload(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      assetType: CareerAssetType;
      publicId?: string;
      objectKey?: string;
      url?: string;
      fileName: string;
      declaredContentType: string;
      sizeBytes: number;
      title?: string;
      description?: string;
    },
    session?: ClientSession
  ): Promise<ICareerAsset> {
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
    details: {
      url?: string;
      secureUrl?: string;
      publicId?: string;
      detectedContentType?: string;
      videoMeta?: VideoMeta;
    } = {},
    session?: ClientSession
  ): Promise<ICareerAsset | null> {
    const updateData: Record<string, unknown> = {
      status: CareerAssetStatus.ACTIVE,
      uploadedAt: new Date(),
      processedAt: new Date(),
    };

    if (details.url) updateData.url = details.url;
    if (details.secureUrl) updateData.secureUrl = details.secureUrl;
    if (details.publicId) updateData.publicId = details.publicId;
    if (details.detectedContentType) updateData.detectedContentType = details.detectedContentType;
    if (details.videoMeta) updateData.videoMeta = details.videoMeta;

    const asset = await this.updateById(institutionId, assetId, updateData, session);

    if (asset && asset.assetType === CareerAssetType.VIDEO_CV && asset.url) {
      await StudentProfile.updateOne(
        { institutionId, userId: asset.userId },
        { $set: { videoCvUrl: asset.secureUrl || asset.url } },
        { session }
      ).exec();
    } else if (asset && asset.assetType === CareerAssetType.RESUME && asset.url) {
      await StudentProfile.updateOne(
        { institutionId, userId: asset.userId },
        { $set: { resumeUrl: asset.secureUrl || asset.url } },
        { session }
      ).exec();
    }

    return asset;
  }

  /**
   * Update video metadata after processing completes.
   */
  async updateVideoTranscoding(
    institutionId: Types.ObjectId,
    assetId: Types.ObjectId,
    videoMeta: VideoMeta,
    status: CareerAssetStatus = CareerAssetStatus.ACTIVE,
    session?: ClientSession
  ): Promise<ICareerAsset | null> {
    const asset = await this.updateById(
      institutionId,
      assetId,
      {
        videoMeta,
        status,
        processedAt: new Date(),
      },
      session
    );

    if (asset && asset.url) {
      await StudentProfile.updateOne(
        { institutionId, userId: asset.userId },
        { $set: { videoCvUrl: asset.secureUrl || asset.url } },
        { session }
      ).exec();
    }

    return asset;
  }
}

export const CareerAssetRepository = new CareerAssetRepositoryClass();
