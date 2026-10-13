/**
 * Mentorship Repository (M5)
 */

import type { Types, ClientSession } from 'mongoose';
import type { IMentorship, PaginationOptions } from '../../types';
import { Mentorship } from '../../models';
import { MentorshipStatus } from '../../types/enums';
import { BaseRepository } from '../base.repository';

class MentorshipRepositoryClass extends BaseRepository<IMentorship> {
  constructor() {
    super(Mentorship);
  }

  /**
   * Find active mentorships for a mentor.
   */
  async findActiveByMentor(
    institutionId: Types.ObjectId,
    mentorAlumnusId: Types.ObjectId
  ): Promise<IMentorship[]> {
    return this.findMany(institutionId, {
      mentorAlumnusId,
      status: MentorshipStatus.ACTIVE,
    });
  }

  /**
   * Find active mentorships for a student.
   */
  async findActiveByStudent(
    institutionId: Types.ObjectId,
    studentUserId: Types.ObjectId
  ): Promise<IMentorship[]> {
    return this.findMany(institutionId, {
      studentUserId,
      status: MentorshipStatus.ACTIVE,
    });
  }

  /**
   * Find all mentorships (active + ended) for analytics/history.
   */
  async findByMentor(
    institutionId: Types.ObjectId,
    mentorAlumnusId: Types.ObjectId,
    options: PaginationOptions = { page: 1, limit: 20 }
  ) {
    return this.findPaginated(institutionId, { mentorAlumnusId }, options, {
      field: 'startedAt',
      order: 'desc',
    });
  }

  /**
   * Idempotent mentorship creation from an accepted request.
   * Uses sourceRequestId unique index to prevent duplicates.
   */
  async createFromAcceptedRequest(
    data: {
      institutionId: Types.ObjectId;
      studentUserId: Types.ObjectId;
      mentorAlumnusId: Types.ObjectId;
      sourceRequestId: Types.ObjectId;
    },
    session?: ClientSession
  ): Promise<IMentorship> {
    // Attempt create — will fail if sourceRequestId already exists (unique index)
    try {
      return await this.create(
        {
          ...data,
          status: MentorshipStatus.ACTIVE,
          startedAt: new Date(),
        } as Partial<IMentorship>,
        session
      );
    } catch (error: unknown) {
      // If duplicate key error on sourceRequestId, return existing (idempotent)
      if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
        const existing = await this.findOne(data.institutionId, {
          sourceRequestId: data.sourceRequestId,
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  /**
   * End a mentorship.
   * Must be called within the same transaction as capacity release.
   */
  async endMentorship(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId,
    session?: ClientSession
  ): Promise<IMentorship | null> {
    return this.updateOne(
      institutionId,
      { _id: mentorshipId, status: MentorshipStatus.ACTIVE },
      {
        $set: {
          status: MentorshipStatus.ENDED,
          endedAt: new Date(),
        },
      },
      session
    );
  }
}

/** Singleton instance */
export const MentorshipRepository = new MentorshipRepositoryClass();
