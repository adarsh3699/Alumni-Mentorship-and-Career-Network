/**
 * Mentorship Request Repository (M5)
 */

import type { Types, ClientSession } from 'mongoose';
import type { IMentorshipRequest, PaginationOptions } from '../../types';
import { MentorshipRequest } from '../../models';
import { MentorshipRequestStatus } from '../../types/enums';
import { BaseRepository } from '../base.repository';

class MentorshipRequestRepositoryClass extends BaseRepository<IMentorshipRequest> {
  constructor() {
    super(MentorshipRequest);
  }

  /**
   * Find requests sent to a specific mentor.
   */
  async findByMentor(
    institutionId: Types.ObjectId,
    mentorAlumnusId: Types.ObjectId,
    status?: string,
    options: PaginationOptions = { page: 1, limit: 20 }
  ) {
    const filter: Record<string, unknown> = { mentorAlumnusId };
    if (status) filter.status = status;
    return this.findPaginated(institutionId, filter, options, {
      field: 'createdAt',
      order: 'desc',
    });
  }

  /**
   * Find requests sent by a specific student.
   */
  async findByStudent(
    institutionId: Types.ObjectId,
    studentUserId: Types.ObjectId,
    status?: string,
    options: PaginationOptions = { page: 1, limit: 20 }
  ) {
    const filter: Record<string, unknown> = { studentUserId };
    if (status) filter.status = status;
    return this.findPaginated(institutionId, filter, options, {
      field: 'createdAt',
      order: 'desc',
    });
  }

  /**
   * Accept a pending request. Returns null if already responded or expired.
   */
  async acceptRequest(
    institutionId: Types.ObjectId,
    requestId: Types.ObjectId,
    respondedBy: Types.ObjectId,
    session?: ClientSession
  ): Promise<IMentorshipRequest | null> {
    return this.updateOne(
      institutionId,
      { _id: requestId, status: MentorshipRequestStatus.PENDING },
      {
        $set: {
          status: MentorshipRequestStatus.ACCEPTED,
          respondedAt: new Date(),
          respondedBy,
        },
      },
      session
    );
  }

  /**
   * Decline a pending request.
   */
  async declineRequest(
    institutionId: Types.ObjectId,
    requestId: Types.ObjectId,
    respondedBy: Types.ObjectId,
    declineReason?: string,
    session?: ClientSession
  ): Promise<IMentorshipRequest | null> {
    return this.updateOne(
      institutionId,
      { _id: requestId, status: MentorshipRequestStatus.PENDING },
      {
        $set: {
          status: MentorshipRequestStatus.DECLINED,
          respondedAt: new Date(),
          respondedBy,
          ...(declineReason && { declineReason }),
        },
      },
      session
    );
  }

  /**
   * Expire pending requests whose expiresAt has passed.
   * Used by the background expiry worker. Idempotent.
   */
  async expirePendingRequests(
    institutionId: Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    return this.updateMany(
      institutionId,
      {
        status: MentorshipRequestStatus.PENDING,
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: MentorshipRequestStatus.EXPIRED } },
      session
    );
  }
}

/** Singleton instance */
export const MentorshipRequestRepository = new MentorshipRequestRepositoryClass();
