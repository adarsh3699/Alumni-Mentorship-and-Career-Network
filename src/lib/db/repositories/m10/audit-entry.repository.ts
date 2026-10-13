/**
 * Audit Entry Repository (M10 / Cross-cutting)
 */

import type { Types } from 'mongoose';
import type { IAuditEntry, PaginationOptions } from '../../types';
import { AuditEntry } from '../../models';
import { BaseRepository } from '../base.repository';

class AuditEntryRepositoryClass extends BaseRepository<IAuditEntry> {
  constructor() {
    super(AuditEntry);
  }

  /**
   * Log an audit entry. Append-only — never update or delete.
   */
  async log(entry: Omit<IAuditEntry, '_id'>): Promise<IAuditEntry> {
    return this.create(entry as Partial<IAuditEntry>);
  }

  /**
   * Find audit trail for a specific resource.
   */
  async findByTarget(
    institutionId: Types.ObjectId,
    targetType: string,
    targetId: Types.ObjectId,
    options: PaginationOptions = { page: 1, limit: 50 }
  ) {
    return this.findPaginated(
      institutionId,
      { targetType, targetId },
      options,
      { field: 'timestamp', order: 'desc' }
    );
  }

  /**
   * Find audit trail for a specific actor.
   */
  async findByActor(
    institutionId: Types.ObjectId,
    actorUserId: Types.ObjectId,
    options: PaginationOptions = { page: 1, limit: 50 }
  ) {
    return this.findPaginated(
      institutionId,
      { actorUserId },
      options,
      { field: 'timestamp', order: 'desc' }
    );
  }
}

export const AuditEntryRepository = new AuditEntryRepositoryClass();
