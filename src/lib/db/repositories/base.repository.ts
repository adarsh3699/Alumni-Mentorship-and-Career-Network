/**
 * P11 Base Repository
 *
 * Generic repository providing common CRUD operations for all modules.
 * Every method enforces tenant isolation via institutionId.
 *
 * Extend this for module-specific query methods.
 *
 * @example
 * ```ts
 * class AlumnusRepository extends BaseRepository<IAlumnus> {
 *   constructor() { super(Alumnus); }
 *   async findVerified(institutionId) { ... }
 * }
 * ```
 */

import type { Model, UpdateQuery, Types, ClientSession, SortOrder } from 'mongoose';
import type { PaginatedResult, PaginationOptions, SortOptions, FilterQuery } from '../types';
import { paginate, tenantFilter } from '../utils/query-helpers';

export class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  // ── Create ─────────────────────────────────────────────────────────

  /**
   * Create a single document.
   */
  async create(
    data: Partial<T>,
    session?: ClientSession
  ): Promise<T> {
    const doc = new this.model(data);
    await doc.save({ session });
    return doc.toObject() as T;
  }

  /**
   * Create multiple documents in bulk.
   */
  async createMany(
    data: Partial<T>[],
    session?: ClientSession
  ): Promise<T[]> {
    const docs = await this.model.insertMany(data as unknown as Array<Record<string, unknown>>, { session });
    return (docs as unknown as Array<{ toObject?: () => T }>).map((d) =>
      typeof d.toObject === 'function' ? d.toObject() : (d as unknown as T)
    );
  }

  // ── Read ───────────────────────────────────────────────────────────

  /**
   * Find a single document by ID within a tenant scope.
   */
  async findById(
    institutionId: Types.ObjectId,
    id: Types.ObjectId,
    projection?: Record<string, 0 | 1>
  ): Promise<T | null> {
    return this.model
      .findOne(tenantFilter<T>(institutionId, { _id: id } as FilterQuery<T>), projection)
      .lean<T>()
      .exec();
  }

  /**
   * Find a single document by filter within a tenant scope.
   */
  async findOne(
    institutionId: Types.ObjectId,
    filter: FilterQuery<T>,
    projection?: Record<string, 0 | 1>
  ): Promise<T | null> {
    return this.model
      .findOne(tenantFilter<T>(institutionId, filter), projection)
      .lean<T>()
      .exec();
  }

  /**
   * Find multiple documents by filter within a tenant scope.
   */
  async findMany(
    institutionId: Types.ObjectId,
    filter: FilterQuery<T> = {},
    sort?: SortOptions,
    projection?: Record<string, 0 | 1>
  ): Promise<T[]> {
    const sortObj: Record<string, SortOrder> = sort
      ? { [sort.field]: sort.order === 'asc' ? 1 : -1 }
      : { _id: -1 };

    return this.model
      .find(tenantFilter<T>(institutionId, filter), projection)
      .sort(sortObj)
      .lean<T[]>()
      .exec();
  }

  /**
   * Find documents with pagination.
   */
  async findPaginated(
    institutionId: Types.ObjectId,
    filter: FilterQuery<T> = {},
    options: PaginationOptions = { page: 1, limit: 20 },
    sort?: SortOptions,
    projection?: Record<string, 0 | 1>
  ): Promise<PaginatedResult<T>> {
    return paginate<T>(
      this.model,
      tenantFilter<T>(institutionId, filter),
      options,
      sort,
      projection
    );
  }

  /**
   * Count documents matching a filter within a tenant scope.
   */
  async count(
    institutionId: Types.ObjectId,
    filter: FilterQuery<T> = {}
  ): Promise<number> {
    return this.model.countDocuments(tenantFilter<T>(institutionId, filter)).exec();
  }

  /**
   * Check if a document exists within a tenant scope.
   */
  async exists(
    institutionId: Types.ObjectId,
    filter: FilterQuery<T>
  ): Promise<boolean> {
    const result = await this.model
      .exists(tenantFilter<T>(institutionId, filter))
      .exec();
    return result !== null;
  }

  // ── Update ─────────────────────────────────────────────────────────

  /**
   * Update a document by ID within a tenant scope.
   * Returns the updated document.
   */
  async updateById(
    institutionId: Types.ObjectId,
    id: Types.ObjectId,
    update: UpdateQuery<T>,
    session?: ClientSession
  ): Promise<T | null> {
    return this.model
      .findOneAndUpdate(
        tenantFilter<T>(institutionId, { _id: id } as FilterQuery<T>),
        update,
        { new: true, runValidators: true, session }
      )
      .lean<T>()
      .exec();
  }

  /**
   * Update a single document matching the filter.
   * Returns the updated document.
   */
  async updateOne(
    institutionId: Types.ObjectId,
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    session?: ClientSession
  ): Promise<T | null> {
    return this.model
      .findOneAndUpdate(
        tenantFilter<T>(institutionId, filter),
        update,
        { new: true, runValidators: true, session }
      )
      .lean<T>()
      .exec();
  }

  /**
   * Update multiple documents matching the filter.
   * Returns the count of modified documents.
   */
  async updateMany(
    institutionId: Types.ObjectId,
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    session?: ClientSession
  ): Promise<number> {
    const result = await this.model.updateMany(
      tenantFilter<T>(institutionId, filter),
      update,
      { runValidators: true, session }
    );
    return result.modifiedCount;
  }

  // ── Delete ─────────────────────────────────────────────────────────

  /**
   * Delete a document by ID within a tenant scope.
   * Returns the deleted document or null.
   */
  async deleteById(
    institutionId: Types.ObjectId,
    id: Types.ObjectId,
    session?: ClientSession
  ): Promise<T | null> {
    return this.model
      .findOneAndDelete(
        tenantFilter<T>(institutionId, { _id: id } as FilterQuery<T>),
        { session }
      )
      .lean<T>()
      .exec();
  }

  /**
   * Delete multiple documents matching the filter.
   * Returns the count of deleted documents.
   */
  async deleteMany(
    institutionId: Types.ObjectId,
    filter: FilterQuery<T>,
    session?: ClientSession
  ): Promise<number> {
    const result = await this.model.deleteMany(
      tenantFilter<T>(institutionId, filter),
      { session }
    );
    return result.deletedCount;
  }
}
