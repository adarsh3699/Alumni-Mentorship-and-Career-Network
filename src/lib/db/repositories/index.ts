/**
 * P11 Repositories — Barrel Export
 *
 * Single entry point for all database repositories.
 *
 * Usage:
 *   import { AlumnusRepository, MentorCapacityRepository, UserMediaAssetRepository } from '@/lib/db/repositories';
 */

// Core
export { InstitutionRepository, UserRepository } from './core';

// M1 — Alumni Verification & Profile
export {
  AlumnusRepository,
  VerificationRequestRepository,
  VerificationDocumentRepository,
  ExpertiseTagRepository,
} from './m1';

// M2 — Capacity & Availability
export { MentorCapacityRepository, AvailabilityWindowRepository } from './m2';

// M3 — Student Career Profile
export { StudentProfileRepository, CareerGoalRepository } from './m3';

// M4 — Matching & Ranking
export { MatchScoreRepository } from './m4';

// M5 — Requests & Mentorship
export { MentorshipRequestRepository, MentorshipRepository } from './m5';

// M6 — Scheduling & Sessions
export { SessionRepository } from './m6';

// M7 — Goals, Actions & Feedback
export { GoalRepository, ActionItemRepository, FeedbackRepository } from './m7';

// M8 — Engagement
export { EngagementSnapshotRepository } from './m8';

// M9 — Messaging
export { MessageRepository } from './m9';

// M10 — Analytics, Policy & Audit
export {
  AuditEntryRepository,
  OutboxEventRepository,
  ProgrammeConfigurationRepository,
  PlacementOutcomeRepository,
} from './m10';

// Media & Documents (Profile pics, Video CVs, Resumes)
export { UserMediaAssetRepository, CareerAssetRepository } from './media';

// Base (for custom repositories)
export { BaseRepository } from './base.repository';
