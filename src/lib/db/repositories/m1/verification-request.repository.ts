/**
 * Verification Request Repository (M1)
 */

import type { Types, ClientSession } from 'mongoose';
import type { IVerificationRequest } from '../../types';
import type { VerificationStatus } from '../../types/enums';
import { VerificationRequest } from '../../models';
import { BaseRepository } from '../base.repository';

class VerificationRequestRepositoryClass extends BaseRepository<IVerificationRequest> {
  constructor() {
    super(VerificationRequest);
  }

  /**
   * Find pending verification requests for ARO review queue.
   */
  async findPendingForReview(
    institutionId: Types.ObjectId,
    options = { page: 1, limit: 20 }
  ) {
    return this.findPaginated(
      institutionId,
      { status: 'pending' },
      options,
      { field: 'submittedAt', order: 'asc' }
    );
  }

  /**
   * Find all requests by a specific alumnus.
   */
  async findByAlumnusId(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId
  ): Promise<IVerificationRequest[]> {
    return this.findMany(
      institutionId,
      { alumnusId },
      { field: 'submittedAt', order: 'desc' }
    );
  }

  /**
   * Record a verification decision (approve/reject).
   * Does NOT update the Alumnus status — that must happen in the service layer
   * within the same transaction boundary.
   */
  async recordDecision(
    institutionId: Types.ObjectId,
    requestId: Types.ObjectId,
    decision: {
      status: VerificationStatus;
      decidedBy: Types.ObjectId;
      rejectionReason?: string;
    },
    session?: ClientSession
  ): Promise<IVerificationRequest | null> {
    return this.updateOne(
      institutionId,
      { _id: requestId, status: 'pending' }, // only pending can be decided
      {
        $set: {
          status: decision.status,
          decidedBy: decision.decidedBy,
          decidedAt: new Date(),
          ...(decision.rejectionReason && { rejectionReason: decision.rejectionReason }),
        },
      },
      session
    );
  }
}

/** Singleton instance */
export const VerificationRequestRepository = new VerificationRequestRepositoryClass();
