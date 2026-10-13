/**
 * Feedback Repository (M7)
 */

import type { Types } from 'mongoose';
import type { IFeedback, PaginationOptions } from '../../types';
import { Feedback } from '../../models';
import { BaseRepository } from '../base.repository';

class FeedbackRepositoryClass extends BaseRepository<IFeedback> {
  constructor() {
    super(Feedback);
  }

  async findByMentorship(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId,
    options: PaginationOptions = { page: 1, limit: 20 }
  ) {
    return this.findPaginated(institutionId, { mentorshipId }, options, {
      field: 'submittedAt',
      order: 'desc',
    });
  }

  /**
   * Compute average rating for a mentor across all their mentorships.
   */
  async averageRatingForMentor(
    institutionId: Types.ObjectId,
    mentorAlumnusId: Types.ObjectId,
    mentorshipIds: Types.ObjectId[]
  ): Promise<{ average: number; count: number }> {
    const result = await this.model.aggregate([
      {
        $match: {
          institutionId,
          mentorshipId: { $in: mentorshipIds },
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    return result[0] ?? { average: 0, count: 0 };
  }
}

export const FeedbackRepository = new FeedbackRepositoryClass();
