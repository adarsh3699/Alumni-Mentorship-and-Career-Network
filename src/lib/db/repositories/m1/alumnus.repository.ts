/**
 * Alumnus Repository (M1)
 * Alumni profile data access — enforces PII privacy projection.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IAlumnus, PaginationOptions, SortOptions } from '../../types';
import type { VerificationStatus } from '../../types/enums';
import { Alumnus, ALUMNUS_STUDENT_SAFE_PROJECTION } from '../../models';
import { BaseRepository } from '../base.repository';
import { paginate, tenantFilter } from '../../utils';

class AlumnusRepositoryClass extends BaseRepository<IAlumnus> {
  constructor() {
    super(Alumnus);
  }

  /**
   * Find alumnus by their userId.
   */
  async findByUserId(
    institutionId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<IAlumnus | null> {
    return this.findOne(institutionId, { userId });
  }

  /**
   * Find all verified alumni — for mentor discovery.
   * ALWAYS uses student-safe projection (no email/phone).
   */
  async findVerifiedForStudentView(
    institutionId: Types.ObjectId,
    options: PaginationOptions = { page: 1, limit: 20 },
    sort?: SortOptions
  ) {
    return paginate<IAlumnus>(
      this.model,
      tenantFilter<IAlumnus>(institutionId, { verificationStatus: 'verified' }),
      options,
      sort,
      ALUMNUS_STUDENT_SAFE_PROJECTION as Record<string, 0 | 1>
    );
  }

  /**
   * Search alumni by industry, expertise, or mentoring interests.
   * Student-safe: never includes email/phone.
   */
  async searchForStudentView(
    institutionId: Types.ObjectId,
    query: {
      industry?: string;
      expertiseTagIds?: Types.ObjectId[];
      mentoringInterests?: string[];
    },
    options: PaginationOptions = { page: 1, limit: 20 }
  ) {
    const filter: Record<string, unknown> = { verificationStatus: 'verified' };

    if (query.industry) {
      filter.industry = { $regex: query.industry, $options: 'i' };
    }
    if (query.expertiseTagIds?.length) {
      filter.expertiseTagIds = { $in: query.expertiseTagIds };
    }
    if (query.mentoringInterests?.length) {
      filter.mentoringInterests = { $in: query.mentoringInterests };
    }

    return paginate<IAlumnus>(
      this.model,
      tenantFilter<IAlumnus>(institutionId, filter),
      options,
      { field: 'displayName', order: 'asc' },
      ALUMNUS_STUDENT_SAFE_PROJECTION as Record<string, 0 | 1>
    );
  }

  /**
   * Update verification status.
   * Called when a verification request is decided.
   */
  async updateVerificationStatus(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId,
    status: VerificationStatus,
    session?: ClientSession
  ): Promise<IAlumnus | null> {
    return this.updateById(
      institutionId,
      alumnusId,
      { $set: { verificationStatus: status } },
      session
    );
  }

  /**
   * Find alumni by verification status — for admin/ARO views.
   * Full projection (includes PII for staff).
   */
  async findByVerificationStatus(
    institutionId: Types.ObjectId,
    status: VerificationStatus,
    options: PaginationOptions = { page: 1, limit: 20 }
  ) {
    return this.findPaginated(
      institutionId,
      { verificationStatus: status },
      options
    );
  }
}

/** Singleton instance */
export const AlumnusRepository = new AlumnusRepositoryClass();
