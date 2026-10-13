/**
 * Match Score Repository (M4)
 *
 * Stores and queries derived mentorship matching scores and ranking results.
 * Used by recommendation engines and matching dashboards.
 */

import type { Types, ClientSession } from 'mongoose';
import type { IMatchScore, PaginationOptions } from '../../types';
import { MatchScore } from '../../models';
import { BaseRepository } from '../base.repository';

class MatchScoreRepositoryClass extends BaseRepository<IMatchScore> {
  constructor() {
    super(MatchScore);
  }

  /**
   * Find top recommended mentor matches for a student profile, sorted by rank ascending (1 = top match).
   */
  async findTopMatchesForStudent(
    institutionId: Types.ObjectId,
    studentProfileId: Types.ObjectId,
    limit: number = 10
  ): Promise<IMatchScore[]> {
    return this.findMany(
      institutionId,
      { studentProfileId },
      { field: 'rank', order: 'asc' }
    ).then((scores) => scores.slice(0, limit));
  }

  /**
   * Find match scores for an alumnus across student queries (analytics/reporting).
   */
  async findByAlumnus(
    institutionId: Types.ObjectId,
    alumnusId: Types.ObjectId,
    options?: PaginationOptions
  ) {
    return this.findPaginated(
      institutionId,
      { alumnusId },
      options,
      { field: 'score', order: 'desc' }
    );
  }

  /**
   * Atomically replace calculated match scores for a student.
   * Clears old cache and persists freshly ranked recommendations.
   */
  async replaceScoresForStudent(
    institutionId: Types.ObjectId,
    studentProfileId: Types.ObjectId,
    scores: Array<Omit<IMatchScore, '_id' | 'institutionId' | 'studentProfileId' | 'createdAt' | 'updatedAt'>>,
    session?: ClientSession
  ): Promise<IMatchScore[]> {
    // Remove previous score snapshots
    await this.deleteMany(institutionId, { studentProfileId }, session);

    if (scores.length === 0) {
      return [];
    }

    const docsToInsert = scores.map((s) => ({
      ...s,
      institutionId,
      studentProfileId,
      generatedAt: s.generatedAt ?? new Date(),
    }));

    return this.createMany(docsToInsert as Partial<IMatchScore>[], session);
  }

  /**
   * Purge expired match score caches older than a threshold (e.g., 30 days).
   */
  async deleteOlderThan(
    institutionId: Types.ObjectId,
    cutoffDate: Date,
    session?: ClientSession
  ): Promise<number> {
    return this.deleteMany(
      institutionId,
      { generatedAt: { $lt: cutoffDate } },
      session
    );
  }
}

export const MatchScoreRepository = new MatchScoreRepositoryClass();
