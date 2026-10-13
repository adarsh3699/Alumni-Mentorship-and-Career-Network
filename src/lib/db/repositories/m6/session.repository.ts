/**
 * Session Repository (M6)
 */

import type { Types, ClientSession as MongoSession } from 'mongoose';
import type { ISession, PaginationOptions } from '../../types';
import type { SessionStatus } from '../../types/enums';
import { Session } from '../../models';
import { BaseRepository } from '../base.repository';

class SessionRepositoryClass extends BaseRepository<ISession> {
  constructor() {
    super(Session);
  }

  /**
   * Find sessions for a mentorship, ordered by start time.
   */
  async findByMentorship(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId,
    options: PaginationOptions = { page: 1, limit: 20 }
  ) {
    return this.findPaginated(institutionId, { mentorshipId }, options, {
      field: 'startAt',
      order: 'asc',
    });
  }

  /**
   * Find upcoming sessions (not cancelled/completed).
   */
  async findUpcoming(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId
  ): Promise<ISession[]> {
    return this.findMany(
      institutionId,
      {
        mentorshipId,
        status: { $in: ['proposed', 'scheduled'] },
        startAt: { $gte: new Date() },
      },
      { field: 'startAt', order: 'asc' }
    );
  }

  /**
   * Transition session status with state-machine validation.
   */
  async transitionStatus(
    institutionId: Types.ObjectId,
    sessionId: Types.ObjectId,
    fromStatus: SessionStatus | SessionStatus[],
    toStatus: SessionStatus,
    updates?: Partial<Pick<ISession, 'meetingUrl' | 'calendarEventId' | 'notes'>>,
    session?: MongoSession
  ): Promise<ISession | null> {
    const statusFilter = Array.isArray(fromStatus)
      ? { $in: fromStatus }
      : fromStatus;

    return this.updateOne(
      institutionId,
      { _id: sessionId, status: statusFilter },
      { $set: { status: toStatus, ...updates } },
      session
    );
  }
}

/** Singleton instance */
export const SessionRepository = new SessionRepositoryClass();
