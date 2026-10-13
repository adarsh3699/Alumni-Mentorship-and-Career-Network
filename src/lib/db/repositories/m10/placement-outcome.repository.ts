/**
 * Placement Outcome Repository (M10)
 *
 * Manages career placement records imported from university placement systems.
 * Provides data access for correlation with mentorship participation.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IPlacementOutcome, PaginationOptions } from '../../types';
import { PlacementOutcome } from '../../models';
import { BaseRepository } from '../base.repository';

class PlacementOutcomeRepositoryClass extends BaseRepository<IPlacementOutcome> {
  constructor() {
    super(PlacementOutcome);
  }

  /**
   * Find placement outcomes for a specific student user.
   */
  async findByStudent(
    institutionId: Types.ObjectId,
    studentUserId: Types.ObjectId
  ): Promise<IPlacementOutcome[]> {
    return this.findMany(
      institutionId,
      { studentUserId },
      { field: 'occurredAt', order: 'desc' }
    );
  }

  /**
   * Find placement records by outcome type (e.g. 'full_time_offer', 'internship', 'higher_studies').
   */
  async findByOutcomeType(
    institutionId: Types.ObjectId,
    outcomeType: string,
    options?: PaginationOptions
  ) {
    return this.findPaginated(
      institutionId,
      { outcomeType },
      options,
      { field: 'occurredAt', order: 'desc' }
    );
  }

  /**
   * Idempotent import from external University Placement / SIS system.
   */
  async upsertFromExternalSource(
    institutionId: Types.ObjectId,
    sourceSystem: string,
    externalReference: string,
    data: Omit<IPlacementOutcome, '_id' | 'institutionId' | 'sourceSystem' | 'externalReference' | 'createdAt' | 'updatedAt'>,
    session?: ClientSession
  ): Promise<IPlacementOutcome> {
    const existing = await this.findOne(institutionId, {
      sourceSystem,
      externalReference,
    });

    if (existing) {
      const updated = await this.updateById(
        institutionId,
        existing._id,
        { ...data },
        session
      );
      return updated!;
    }

    return this.create(
      {
        ...data,
        institutionId,
        sourceSystem,
        externalReference,
      },
      session
    );
  }

  /**
   * Aggregated count of placement outcomes grouped by outcome type.
   */
  async getOutcomeCountsByType(
    institutionId: Types.ObjectId
  ): Promise<Array<{ outcomeType: string; count: number }>> {
    const results = await this.model.aggregate([
      { $match: { institutionId } },
      {
        $group: {
          _id: '$outcomeType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return results.map((r) => ({
      outcomeType: r._id,
      count: r.count,
    }));
  }
}

export const PlacementOutcomeRepository = new PlacementOutcomeRepositoryClass();
