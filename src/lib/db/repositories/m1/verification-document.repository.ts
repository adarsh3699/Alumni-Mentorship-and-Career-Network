/**
 * Verification Document Repository (M1)
 *
 * Manages verification document metadata stored in MongoDB.
 * Note: Actual binary files are stored in S3/quarantine object store.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IVerificationDocument, PaginationOptions } from '../../types';
import { VerificationDocumentStatus } from '../../types/enums';
import { VerificationDocument } from '../../models';
import { BaseRepository } from '../base.repository';

class VerificationDocumentRepositoryClass extends BaseRepository<IVerificationDocument> {
  constructor() {
    super(VerificationDocument);
  }

  /**
   * Find all documents attached to a specific verification request.
   */
  async findByRequestId(
    institutionId: Types.ObjectId,
    verificationRequestId: Types.ObjectId
  ): Promise<IVerificationDocument[]> {
    return this.findMany(
      institutionId,
      { verificationRequestId },
      { field: 'createdAt', order: 'asc' }
    );
  }

  /**
   * Find documents pending automated scan or validation review.
   */
  async findPendingValidation(
    institutionId: Types.ObjectId,
    options?: PaginationOptions
  ) {
    return this.findPaginated(
      institutionId,
      {
        status: {
          $in: [
            VerificationDocumentStatus.PENDING_UPLOAD,
            VerificationDocumentStatus.VALIDATING,
          ],
        },
      },
      options
    );
  }

  /**
   * Update status of a verification document (e.g. after antivirus scan or manual review).
   */
  async updateStatus(
    institutionId: Types.ObjectId,
    documentId: Types.ObjectId,
    status: VerificationDocumentStatus,
    validationMessage?: string,
    session?: ClientSession
  ): Promise<IVerificationDocument | null> {
    const update: Record<string, unknown> = {
      status,
      validatedAt: new Date(),
    };
    if (validationMessage !== undefined) {
      update.validationMessage = validationMessage;
    }

    return this.updateById(institutionId, documentId, update, session);
  }

  /**
   * Mark a document rejected if invalid or unverified.
   */
  async markRejected(
    institutionId: Types.ObjectId,
    documentId: Types.ObjectId,
    reason: string,
    session?: ClientSession
  ): Promise<IVerificationDocument | null> {
    return this.updateById(
      institutionId,
      documentId,
      {
        status: VerificationDocumentStatus.REJECTED,
        validationMessage: reason,
        scannedAt: new Date(),
        validatedAt: new Date(),
      },
      session
    );
  }

  /**
   * Mark document approved for alumni office review.
   */
  async markApproved(
    institutionId: Types.ObjectId,
    documentId: Types.ObjectId,
    detectedContentType?: string,
    session?: ClientSession
  ): Promise<IVerificationDocument | null> {
    const update: Record<string, unknown> = {
      status: VerificationDocumentStatus.APPROVED,
      validatedAt: new Date(),
      scannedAt: new Date(),
    };
    if (detectedContentType) {
      update.detectedContentType = detectedContentType;
    }
    return this.updateById(institutionId, documentId, update, session);
  }
}

export const VerificationDocumentRepository = new VerificationDocumentRepositoryClass();
