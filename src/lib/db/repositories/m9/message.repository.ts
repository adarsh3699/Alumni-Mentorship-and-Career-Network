/**
 * Message Repository (M9)
 */

import type { Types } from 'mongoose';
import type { IMessage, PaginationOptions } from '../../types';
import { Message } from '../../models';
import { BaseRepository } from '../base.repository';

class MessageRepositoryClass extends BaseRepository<IMessage> {
  constructor() {
    super(Message);
  }

  /**
   * Find messages in a mentorship conversation (paginated, newest first).
   */
  async findByMentorship(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId,
    options: PaginationOptions = { page: 1, limit: 50 }
  ) {
    return this.findPaginated(institutionId, { mentorshipId }, options, {
      field: 'sentAt',
      order: 'desc',
    });
  }

  /**
   * Get the last message in a mentorship (for engagement tracking).
   */
  async findLastMessage(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId
  ): Promise<IMessage | null> {
    return this.model
      .findOne({ institutionId, mentorshipId })
      .sort({ sentAt: -1 })
      .lean<IMessage>()
      .exec();
  }

  /**
   * Count unread messages since a timestamp.
   */
  async countSince(
    institutionId: Types.ObjectId,
    mentorshipId: Types.ObjectId,
    since: Date
  ): Promise<number> {
    return this.count(institutionId, {
      mentorshipId,
      sentAt: { $gt: since },
    });
  }
}

export const MessageRepository = new MessageRepositoryClass();
