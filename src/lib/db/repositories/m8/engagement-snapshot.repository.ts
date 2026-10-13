/**
 * Engagement Snapshot Repository (M8)
 */

import type { Types } from 'mongoose';
import type { IEngagementSnapshot } from '../../types';
import { EngagementSnapshot } from '../../models';
import { BaseRepository } from '../base.repository';

class EngagementSnapshotRepositoryClass extends BaseRepository<IEngagementSnapshot> {
  constructor() {
    super(EngagementSnapshot);
  }

  /**
   * Get the latest engagement snapshot for a mentorship.
   */
  async findLatest(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId
  ): Promise<IEngagementSnapshot | null> {
    return this.model
      .findOne({ institutionId, mentorshipId })
      .sort({ assessedAt: -1 })
      .lean<IEngagementSnapshot>()
      .exec();
  }

  /**
   * Find all mentorships at risk (for nudge processing).
   */
  async findAtRiskMentorships(
    institutionId: Types.ObjectId
  ): Promise<IEngagementSnapshot[]> {
    // Get latest snapshot per mentorship using aggregation
    const result = await this.model.aggregate([
      { $match: { institutionId } },
      { $sort: { assessedAt: -1 } },
      {
        $group: {
          _id: '$mentorshipId',
          latest: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latest' } },
      { $match: { status: { $in: ['at_risk', 'inactive'] } } },
    ]);

    return result;
  }
}

export const EngagementSnapshotRepository = new EngagementSnapshotRepositoryClass();
