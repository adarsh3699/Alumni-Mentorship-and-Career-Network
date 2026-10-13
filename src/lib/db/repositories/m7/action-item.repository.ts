/**
 * Action Item Repository (M7)
 */

import type { Types } from 'mongoose';
import type { IActionItem } from '../../types';
import { ActionItem } from '../../models';
import { ActionItemStatus } from '../../types/enums';
import { BaseRepository } from '../base.repository';

class ActionItemRepositoryClass extends BaseRepository<IActionItem> {
  constructor() {
    super(ActionItem);
  }

  async findByGoal(
    institutionId: Types.ObjectId,
    goalId: Types.ObjectId
  ): Promise<IActionItem[]> {
    return this.findMany(institutionId, { goalId }, { field: 'createdAt', order: 'asc' });
  }

  async findOverdueByMentorship(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId
  ): Promise<IActionItem[]> {
    return this.findMany(institutionId, {
      mentorshipId,
      status: ActionItemStatus.PENDING,
      dueDate: { $lt: new Date() },
    });
  }

  async markCompleted(
    institutionId: Types.ObjectId,
    actionItemId: Types.ObjectId
  ): Promise<IActionItem | null> {
    return this.updateOne(
      institutionId,
      { _id: actionItemId, status: ActionItemStatus.PENDING },
      { $set: { status: ActionItemStatus.COMPLETED, completedAt: new Date() } }
    );
  }
}

export const ActionItemRepository = new ActionItemRepositoryClass();
