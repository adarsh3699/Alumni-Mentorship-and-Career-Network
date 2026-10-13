/**
 * Goal Repository (M7)
 */

import type { Types } from 'mongoose';
import type { IGoal } from '../../types';
import { Goal } from '../../models';
import { BaseRepository } from '../base.repository';

class GoalRepositoryClass extends BaseRepository<IGoal> {
  constructor() {
    super(Goal);
  }

  async findByMentorship(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId
  ): Promise<IGoal[]> {
    return this.findMany(institutionId, { mentorshipId }, { field: 'createdAt', order: 'desc' });
  }

  async countByStatus(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId
  ): Promise<Record<string, number>> {
    const result = await this.model.aggregate([
      { $match: { institutionId, mentorshipId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(result.map((r) => [r._id, r.count]));
  }
}

export const GoalRepository = new GoalRepositoryClass();
