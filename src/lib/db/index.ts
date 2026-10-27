/**
 * P11 Database Layer — Main Entry Point
 *
 * This is the ONLY file application code should import from for database access.
 *
 * Usage:
 *   import { connectDB, AlumnusRepository, withTransaction } from '@/lib/db';
 *
 * Architecture:
 *   Route Handler / Server Action
 *     → Application Service (business logic)
 *       → Repository (this layer — data access)
 *         → Mongoose Model → MongoDB
 */

// Connection & Health
export {
  connectDB,
  disconnectDB,
  getConnectionState,
  checkDatabaseHealth,
} from './connection';

// All Repositories
export {
  // Core
  InstitutionRepository,
  UserRepository,
  // M1
  AlumnusRepository,
  VerificationRequestRepository,
  VerificationDocumentRepository,
  ExpertiseTagRepository,
  // M2
  MentorCapacityRepository,
  AvailabilityWindowRepository,
  // M3
  StudentProfileRepository,
  CareerGoalRepository,
  // M4
  MatchScoreRepository,
  // M5
  MentorshipRequestRepository,
  MentorshipRepository,
  // M6
  SessionRepository,
  // M7
  GoalRepository,
  ActionItemRepository,
  FeedbackRepository,
  // M8
  EngagementSnapshotRepository,
  // M9
  MessageRepository,
  // M10
  AuditEntryRepository,
  OutboxEventRepository,
  ProgrammeConfigurationRepository,
  PlacementOutcomeRepository,
  // Media & Documents
  UserMediaAssetRepository,
  CareerAssetRepository,
  // Base (for extending)
  BaseRepository,
} from './repositories';

// Models (for advanced aggregations or direct model access)
export {
  Institution,
  User,
  Alumnus,
  ALUMNUS_STUDENT_SAFE_PROJECTION,
  VerificationRequest,
  VerificationDocument,
  ExpertiseTag,
  MentorCapacity,
  AvailabilityWindow,
  StudentProfile,
  CareerGoal,
  MatchScore,
  MentorshipRequest,
  Mentorship,
  Session,
  Goal,
  ActionItem,
  Feedback,
  EngagementSnapshot,
  Message,
  ProgrammeConfiguration,
  PlacementOutcome,
  AuditEntry,
  OutboxEvent,
  UserMediaAsset,
  CareerAsset,
} from './models';

// Utilities
export {
  withTransaction,
  withSession,
  paginate,
  tenantFilter,
  getCloudinaryConfig,
  buildCloudinaryAssetFolder,
  parseCloudinaryUrl,
  buildCloudinaryImageUrl,
  buildCloudinaryVideoUrl,
  buildCloudinaryVideoThumbnail,
  generateCloudinaryUploadSignature,
} from './utils';

// Types (re-export for convenience)
export type {
  PaginatedResult,
  PaginationOptions,
  SortOptions,
  FilterQuery,
  IInstitution,
  IUser,
  IAlumnus,
  IVerificationRequest,
  IVerificationDocument,
  IExpertiseTag,
  IMentorCapacity,
  IAvailabilityWindow,
  IStudentProfile,
  ICareerGoal,
  IMatchScore,
  IMentorshipRequest,
  IMentorship,
  ISession,
  IGoal,
  IActionItem,
  IFeedback,
  IEngagementSnapshot,
  IMessage,
  IProgrammeConfiguration,
  IPlacementOutcome,
  IAuditEntry,
  IOutboxEvent,
  IUserMediaAsset,
  ICareerAsset,
} from './types';

// Enums
export {
  UserRole,
  UserStatus,
  InstitutionStatus,
  VerificationStatus,
  VerificationDocumentStatus,
  ExpertiseTagStatus,
  CareerGoalStatus,
  MentorshipRequestStatus,
  MentorshipStatus,
  SessionStatus,
  GoalStatus,
  ActionItemStatus,
  EngagementStatus,
  OutboxEventStatus,
  MediaAssetType,
  MediaAssetStatus,
  CareerAssetType,
  CareerAssetStatus,
  CalendarProvider,
} from './types/enums';
