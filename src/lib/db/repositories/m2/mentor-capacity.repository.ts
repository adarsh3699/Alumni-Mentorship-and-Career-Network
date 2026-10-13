/**
 * Mentor Capacity Repository (M2)
 *
 * Contains the CRITICAL atomic capacity reservation logic.
 * This is the concurrency correctness boundary for P11.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IMentorCapacity } from '../../types';
import { MentorCapacity } from '../../models';
import { BaseRepository } from '../base.repository';

class MentorCapacityRepositoryClass extends BaseRepository<IMentorCapacity> {
  constructor() {
    super(MentorCapacity);
  }

  /**
   * Find capacity record for a mentor.
   */
  async findByAlumnusId(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId
  ): Promise<IMentorCapacity | null> {
    return this.findOne(institutionId, { alumnusId });
  }

  /**
   * ⚠️ CRITICAL: Atomic capacity reservation.
   *
   * Uses MongoDB conditional update to atomically increment activeMentees
   * ONLY if the current count is below the maximum.
   *
   * Returns the updated document if capacity was available, null otherwise.
   * A null return means capacity is full — the acceptance must fail.
   *
   * This is the ONLY correct way to reserve mentor capacity.
   * DO NOT use read-then-write patterns.
   */
  async atomicReserveSlot(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId,
    session?: ClientSession
  ): Promise<IMentorCapacity | null> {
    return this.model
      .findOneAndUpdate(
        {
          institutionId,
          alumnusId,
          acceptingNewMentees: true,
          // The critical condition: only succeed if there's room
          $expr: { $lt: ['$activeMentees', '$maxConcurrentMentees'] },
        },
        { $inc: { activeMentees: 1 } },
        { new: true, session }
      )
      .lean<IMentorCapacity>()
      .exec();
  }

  /**
   * ⚠️ CRITICAL: Atomic capacity release.
   *
   * Decrements activeMentees when a mentorship ends.
   * Must be called within the same transaction as the mentorship status change.
   */
  async atomicReleaseSlot(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId,
    session?: ClientSession
  ): Promise<IMentorCapacity | null> {
    return this.model
      .findOneAndUpdate(
        {
          institutionId,
          alumnusId,
          activeMentees: { $gt: 0 }, // prevent negative
        },
        { $inc: { activeMentees: -1 } },
        { new: true, session }
      )
      .lean<IMentorCapacity>()
      .exec();
  }

  /**
   * Check if a mentor has available capacity (read-only check).
   * Use atomicReserveSlot for actual reservation — NOT this method.
   */
  async hasAvailableCapacity(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId
  ): Promise<boolean> {
    return this.exists(institutionId, {
      alumnusId,
      acceptingNewMentees: true,
      $expr: { $lt: ['$activeMentees', '$maxConcurrentMentees'] },
    });
  }

  /**
   * Find all mentors with available capacity (for matching).
   */
  async findWithAvailableCapacity(
    institutionId: Types.ObjectId
  ): Promise<IMentorCapacity[]> {
    return this.model
      .find({
        institutionId,
        acceptingNewMentees: true,
        $expr: { $lt: ['$activeMentees', '$maxConcurrentMentees'] },
      })
      .lean<IMentorCapacity[]>()
      .exec();
  }
}

/** Singleton instance */
export const MentorCapacityRepository = new MentorCapacityRepositoryClass();
