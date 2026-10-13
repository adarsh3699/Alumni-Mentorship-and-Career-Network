/**
 * Expertise Tag Repository (M1)
 *
 * Manages institutional expertise taxonomy and autocomplete.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IExpertiseTag } from '../../types';
import { ExpertiseTagStatus } from '../../types/enums';
import { ExpertiseTag } from '../../models';
import { BaseRepository } from '../base.repository';

class ExpertiseTagRepositoryClass extends BaseRepository<IExpertiseTag> {
  constructor() {
    super(ExpertiseTag);
  }

  /**
   * Find all active tags for mentor selection and search filtering.
   */
  async findAllActive(institutionId: Types.ObjectId): Promise<IExpertiseTag[]> {
    return this.findMany(
      institutionId,
      { status: ExpertiseTagStatus.ACTIVE },
      { field: 'name', order: 'asc' }
    );
  }

  /**
   * Find tag by exact name within institution.
   */
  async findByName(
    institutionId: Types.ObjectId,
    name: string
  ): Promise<IExpertiseTag | null> {
    return this.findOne(institutionId, {
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
  }

  /**
   * Search active tags for autocomplete UI.
   */
  async searchByName(
    institutionId: Types.ObjectId,
    query: string,
    limit: number = 10
  ): Promise<IExpertiseTag[]> {
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.findMany(
      institutionId,
      {
        status: ExpertiseTagStatus.ACTIVE,
        name: { $regex: new RegExp(escaped, 'i') },
      },
      { field: 'name', order: 'asc' }
    ).then((tags) => tags.slice(0, limit));
  }

  /**
   * Bulk find or create expertise tags (useful when mentor selects or inputs tags).
   */
  async findOrCreateMany(
    institutionId: Types.ObjectId,
    names: string[],
    session?: ClientSession
  ): Promise<IExpertiseTag[]> {
    const cleanedNames = Array.from(
      new Set(names.map((n) => n.trim()).filter((n) => n.length > 0))
    );

    const existing = await this.findMany(institutionId, {
      name: { $in: cleanedNames.map((n) => new RegExp(`^${n}$`, 'i')) },
    });

    const existingNamesLower = new Set(existing.map((t) => t.name.toLowerCase()));
    const toCreate = cleanedNames.filter((n) => !existingNamesLower.has(n.toLowerCase()));

    if (toCreate.length === 0) {
      return existing;
    }

    const created = await this.createMany(
      toCreate.map((name) => ({
        institutionId,
        name,
        status: ExpertiseTagStatus.ACTIVE,
      })),
      session
    );

    return [...existing, ...created];
  }
}

export const ExpertiseTagRepository = new ExpertiseTagRepositoryClass();
