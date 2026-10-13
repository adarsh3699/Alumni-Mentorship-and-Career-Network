/**
 * Stage 1: Hard Candidate Filtering
 *
 * Enforces business rules and system invariants before any vector or scoring math:
 * - Multi-tenant isolation (institutionId)
 * - Verification status ('verified' only)
 * - Concurrency capacity limits (activeMentees < maxConcurrentMentees & acceptingNewMentees)
 * - Relationship deduplication (no existing active mentorship or pending request)
 * - Anti-herd throttle (prevents overwhelming mentors with too many simultaneous pending requests)
 */

import type { Types } from 'mongoose';
import type { IAlumnus, IMentorCapacity } from '../../db/types';
import { VerificationStatus } from '../../db/types/enums';

export interface FilterInputCandidate {
  alumnus: IAlumnus;
  capacity: IMentorCapacity | null;
  pendingRequestCount: number;
}

export interface FilterContext {
  institutionId: Types.ObjectId;
  studentUserId: Types.ObjectId;
  existingActiveMentorIds: Set<string>;
  existingPendingMentorIds: Set<string>;
  maxPendingRequestsPerMentor?: number;
}

export function filterCandidateMentors(
  candidates: FilterInputCandidate[],
  context: FilterContext
): Array<{ alumnus: IAlumnus; capacity: IMentorCapacity; pendingRequestCount: number }> {
  const maxPendingRequests = context.maxPendingRequestsPerMentor ?? 3;
  const filtered: Array<{ alumnus: IAlumnus; capacity: IMentorCapacity; pendingRequestCount: number }> = [];

  for (const item of candidates) {
    const { alumnus, capacity, pendingRequestCount } = item;

    // 1. Tenant Check
    if (!alumnus.institutionId.equals(context.institutionId)) {
      continue;
    }

    // 2. Verification Check (SRS FR-M4-01)
    if (alumnus.verificationStatus !== VerificationStatus.VERIFIED) {
      continue;
    }

    // 3. Capacity & Accepting Check (SRS FR-M4-04 & FR-M4-08)
    if (!capacity) {
      continue;
    }
    if (!capacity.acceptingNewMentees) {
      continue;
    }
    if (capacity.activeMentees >= capacity.maxConcurrentMentees) {
      continue;
    }

    // 4. Duplicate Relationship Check
    const alumnusIdStr = alumnus._id.toString();
    if (context.existingActiveMentorIds.has(alumnusIdStr)) {
      continue;
    }
    if (context.existingPendingMentorIds.has(alumnusIdStr)) {
      continue;
    }

    // 5. Anti-Herd Request Throttle
    // If a mentor already has 3 or more pending requests waiting for their response,
    // temporarily throttle them to give other qualified mentors visibility.
    if (pendingRequestCount >= maxPendingRequests) {
      continue;
    }

    filtered.push({
      alumnus,
      capacity,
      pendingRequestCount,
    });
  }

  return filtered;
}
