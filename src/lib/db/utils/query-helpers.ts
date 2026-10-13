/**
 * P11 Database Utilities — Query Helpers
 *
 * Reusable helpers for pagination, sorting, and common query patterns
 * used across all repositories.
 */

import type { Model, SortOrder } from 'mongoose';
import type { PaginatedResult, PaginationOptions, SortOptions, FilterQuery } from '../types';

/**
 * Apply pagination to a Mongoose query and return a standardized result.
 *
 * @example
 * ```ts
 * const result = await paginate(Alumnus, {
 *   institutionId,
 *   verificationStatus: 'verified'
 * }, { page: 1, limit: 20 }, { field: 'displayName', order: 'asc' });
 * ```
 */
export async function paginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  options: PaginationOptions,
  sort?: SortOptions,
  projection?: Record<string, 0 | 1>
): Promise<PaginatedResult<T>> {
  const { page, limit } = normalizePagination(options);
  const skip = (page - 1) * limit;

  const sortObj: Record<string, SortOrder> = sort
    ? { [sort.field]: sort.order === 'asc' ? 1 : -1 }
    : { _id: -1 };

  const [data, total] = await Promise.all([
    model
      .find(filter, projection)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean<T[]>()
      .exec(),
    model.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Normalize and clamp pagination values.
 */
export function normalizePagination(options: Partial<PaginationOptions>): PaginationOptions {
  return {
    page: Math.max(1, options.page ?? 1),
    limit: Math.min(100, Math.max(1, options.limit ?? 20)),
  };
}

/**
 * Build a tenant-scoped filter. Always prepends institutionId to prevent
 * cross-tenant data leakage.
 *
 * @example
 * ```ts
 * const filter = tenantFilter(institutionId, { status: 'pending' });
 * // => { institutionId, status: 'pending' }
 * ```
 */
export function tenantFilter<T>(
  institutionId: import('mongoose').Types.ObjectId,
  additionalFilter: FilterQuery<T> = {}
): FilterQuery<T> {
  return { institutionId, ...additionalFilter } as FilterQuery<T>;
}
