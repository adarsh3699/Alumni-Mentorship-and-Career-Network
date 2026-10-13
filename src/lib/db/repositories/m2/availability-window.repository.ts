/**
 * Availability Window Repository (M2)
 */

import type { Types } from 'mongoose';
import type { IAvailabilityWindow } from '../../types';
import { AvailabilityWindow } from '../../models';
import { BaseRepository } from '../base.repository';

class AvailabilityWindowRepositoryClass extends BaseRepository<IAvailabilityWindow> {
  constructor() {
    super(AvailabilityWindow);
  }

  /**
   * Find current and future availability for a mentor.
   */
  async findUpcoming(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId
  ): Promise<IAvailabilityWindow[]> {
    return this.findMany(
      institutionId,
      { alumnusId, endAt: { $gte: new Date() } },
      { field: 'startAt', order: 'asc' }
    );
  }

  /**
   * Find overlapping windows for conflict detection.
   */
  async findOverlapping(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId,
    startAt: Date,
    endAt: Date
  ): Promise<IAvailabilityWindow[]> {
    return this.findMany(institutionId, {
      alumnusId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
  }

  /**
   * Replace all availability windows for a mentor (bulk update).
   */
  async replaceAll(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId,
    windows: Array<{ startAt: Date; endAt: Date; timezone: string }>
  ): Promise<IAvailabilityWindow[]> {
    await this.deleteMany(institutionId, { alumnusId });
    const data = windows.map((w) => ({ institutionId, alumnusId, ...w }));
    return this.createMany(data as Partial<IAvailabilityWindow>[]);
  }
}

/** Singleton instance */
export const AvailabilityWindowRepository = new AvailabilityWindowRepositoryClass();
