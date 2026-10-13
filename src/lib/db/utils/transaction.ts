/**
 * P11 Database Utilities — Transaction Helper
 *
 * Provides a safe wrapper around MongoDB sessions & transactions
 * for multi-document atomic operations.
 */

import mongoose, { ClientSession } from 'mongoose';

/**
 * Execute a callback within a MongoDB transaction.
 * Automatically handles commit/abort and session cleanup.
 *
 * Requires a MongoDB replica set (production deployment).
 *
 * @example
 * ```ts
 * const result = await withTransaction(async (session) => {
 *   await MentorCapacity.findOneAndUpdate(
 *     { alumnusId, activeMentees: { $lt: maxCap } },
 *     { $inc: { activeMentees: 1 } },
 *     { session }
 *   );
 *   return await Mentorship.create([{ ... }], { session });
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });

    const result = await callback(session);

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Execute a callback with a session (no transaction).
 * Useful for causal consistency without full transaction overhead.
 */
export async function withSession<T>(
  callback: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    return await callback(session);
  } finally {
    await session.endSession();
  }
}
