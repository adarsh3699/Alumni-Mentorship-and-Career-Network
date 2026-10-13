/**
 * Outbox Event Repository (Cross-cutting)
 * Supports the durable outbox dispatcher pattern.
 */

import type { Types } from 'mongoose';
import type { IOutboxEvent } from '../../types';
import { OutboxEvent } from '../../models';
import { OutboxEventStatus } from '../../types/enums';
import { BaseRepository } from '../base.repository';

class OutboxEventRepositoryClass extends BaseRepository<IOutboxEvent> {
  constructor() {
    super(OutboxEvent);
  }

  /**
   * Find pending events ready for dispatch.
   */
  async findPendingForDispatch(
    institutionId: Types.ObjectId,
    limit: number = 50
  ): Promise<IOutboxEvent[]> {
    return this.model
      .find({
        institutionId,
        status: OutboxEventStatus.PENDING,
        availableAt: { $lte: new Date() },
      })
      .sort({ availableAt: 1 })
      .limit(limit)
      .lean<IOutboxEvent[]>()
      .exec();
  }

  /**
   * Mark an event as dispatched after successful queue submission.
   */
  async markDispatched(
    institutionId: Types.ObjectId,
    eventId: Types.ObjectId
  ): Promise<IOutboxEvent | null> {
    return this.updateOne(
      institutionId,
      { _id: eventId, status: OutboxEventStatus.PENDING },
      {
        $set: {
          status: OutboxEventStatus.DISPATCHED,
          dispatchedAt: new Date(),
        },
      }
    );
  }

  /**
   * Mark an event as failed with error information.
   */
  async markFailed(
    institutionId: Types.ObjectId,
    eventId: Types.ObjectId,
    error: string
  ): Promise<IOutboxEvent | null> {
    return this.updateOne(
      institutionId,
      { _id: eventId },
      {
        $set: {
          status: OutboxEventStatus.FAILED,
          lastError: error,
        },
        $inc: { attempts: 1 },
      }
    );
  }

  /**
   * Retry a failed event — resets status to pending.
   */
  async retryFailed(
    institutionId: Types.ObjectId,
    eventId: Types.ObjectId
  ): Promise<IOutboxEvent | null> {
    return this.updateOne(
      institutionId,
      { _id: eventId, status: OutboxEventStatus.FAILED },
      {
        $set: {
          status: OutboxEventStatus.PENDING,
          availableAt: new Date(),
        },
      }
    );
  }
}

export const OutboxEventRepository = new OutboxEventRepositoryClass();
