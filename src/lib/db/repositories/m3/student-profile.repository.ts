/**
 * Student Profile Repository (M3)
 */

import type { Types } from 'mongoose';
import type { IStudentProfile } from '../../types';
import { StudentProfile } from '../../models';
import { BaseRepository } from '../base.repository';

class StudentProfileRepositoryClass extends BaseRepository<IStudentProfile> {
  constructor() {
    super(StudentProfile);
  }

  async findByUserId(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<IStudentProfile | null> {
    return this.findOne(institutionId, { userId });
  }

  /**
   * Upsert student profile — create or update in one operation.
   */
  async upsertByUserId(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId,
    data: Partial<Pick<IStudentProfile, 'interests' | 'targetRoles' | 'targetIndustries'>>
  ): Promise<IStudentProfile> {
    const result = await this.model
      .findOneAndUpdate(
        { institutionId, userId },
        { $set: { ...data, institutionId, userId } },
        { new: true, upsert: true, runValidators: true }
      )
      .lean<IStudentProfile>()
      .exec();
    return result!;
  }
}

/** Singleton instance */
export const StudentProfileRepository = new StudentProfileRepositoryClass();
