/**
 * Programme Configuration Repository (M10)
 *
 * Manages versioned administrative policies, matching weights,
 * and institution-level mentorship program rules.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IProgrammeConfiguration, PaginationOptions } from '../../types';
import { ProgrammeConfiguration } from '../../models';
import { BaseRepository } from '../base.repository';

class ProgrammeConfigurationRepositoryClass extends BaseRepository<IProgrammeConfiguration> {
  constructor() {
    super(ProgrammeConfiguration);
  }

  /**
   * Find currently active configuration for the institution (effective on or before now).
   */
  async findCurrentEffective(
    institutionId: Types.ObjectId
  ): Promise<IProgrammeConfiguration | null> {
    const now = new Date();
    const configs = await this.findMany(
      institutionId,
      { effectiveFrom: { $lte: now } },
      { field: 'effectiveFrom', order: 'desc' }
    );
    return configs[0] ?? null;
  }

  /**
   * Find configuration by exact version number.
   */
  async findByVersion(
    institutionId: Types.ObjectId,
    version: number
  ): Promise<IProgrammeConfiguration | null> {
    return this.findOne(institutionId, { version });
  }

  /**
   * Find the highest existing version number.
   */
  async getLatestVersionNumber(institutionId: Types.ObjectId): Promise<number> {
    const latest = await this.findMany(
      institutionId,
      {},
      { field: 'version', order: 'desc' }
    );
    return latest[0]?.version ?? 0;
  }

  /**
   * Create a new policy version, automatically incrementing the version number.
   */
  async createNextVersion(
    institutionId: Types.ObjectId,
    data: Omit<IProgrammeConfiguration, '_id' | 'institutionId' | 'version' | 'createdAt' | 'updatedAt'>,
    session?: ClientSession
  ): Promise<IProgrammeConfiguration> {
    const currentMax = await this.getLatestVersionNumber(institutionId);
    return this.create(
      {
        ...data,
        institutionId,
        version: currentMax + 1,
        effectiveFrom: data.effectiveFrom ?? new Date(),
      },
      session
    );
  }

  /**
   * List configuration revision history.
   */
  async findHistory(
    institutionId: Types.ObjectId,
    options?: PaginationOptions
  ) {
    return this.findPaginated(
      institutionId,
      {},
      options,
      { field: 'version', order: 'desc' }
    );
  }
}

export const ProgrammeConfigurationRepository = new ProgrammeConfigurationRepositoryClass();
