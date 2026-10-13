/**
 * Career Goal Repository (M3)
 */

import type { Types } from 'mongoose';
import type { ICareerGoal } from '../../types';
import type { CareerGoalStatus } from '../../types/enums';
import { CareerGoal } from '../../models';
import { BaseRepository } from '../base.repository';

class CareerGoalRepositoryClass extends BaseRepository<ICareerGoal> {
  constructor() {
    super(CareerGoal);
  }

  async findByStudentProfile(
    institutionId: Types.ObjectId,
    studentProfileId: Types.ObjectId,
    status?: CareerGoalStatus
  ): Promise<ICareerGoal[]> {
    const filter: Record<string, unknown> = { studentProfileId };
    if (status) filter.status = status;
    return this.findMany(institutionId, filter, { field: 'createdAt', order: 'desc' });
  }
}

/** Singleton instance */
export const CareerGoalRepository = new CareerGoalRepositoryClass();
