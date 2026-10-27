/**
 * P11 Database Types
 * TypeScript interfaces for all MongoDB document shapes.
 * These types are the contract between the database layer and the application services.
 * Source: docs/Database_Design.md
 */

import type { Types } from 'mongoose';
import type {
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
} from './enums';

// ── Base Types ─────────────────────────────────────────────────────────

/** Fields present on every tenant-scoped document */
export interface TenantScoped {
  institutionId: Types.ObjectId;
}

/** Standard timestamp fields */
export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

/** Combined base for most P11 documents */
export interface BaseDocument extends TenantScoped, Timestamped {
  _id: Types.ObjectId;
}

// ── Pagination & Query Helpers ─────────────────────────────────────────

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

/** Filter query type for MongoDB/Mongoose models */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type FilterQuery<T = unknown> = Record<string, unknown>;

// ── Core Identity ──────────────────────────────────────────────────────

export interface IInstitution extends BaseDocument {
  name: string;
  code: string;
  status: InstitutionStatus;
}

export interface IUser extends BaseDocument {
  externalIdentityId: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
}

// ── M1: Alumni Verification & Profile ──────────────────────────────────

export interface IAlumnus extends BaseDocument {
  userId: Types.ObjectId;
  verificationStatus: VerificationStatus;
  expertiseTagIds: Types.ObjectId[];
  mentoringInterests: string[];
  displayName: string;
  name?: string;
  avatarUrl?: string;
  professionalHeadline?: string;
  currentRole?: string;
  currentTitle?: string;
  currentCompany?: string;
  industry?: string;
  degree?: string;
  major?: string;
  bio?: string;
  city?: string;
  country?: string;
  expertise?: string[];
  /** RESTRICTED — never include in student-facing projections */
  email?: string;
  /** RESTRICTED — never include in student-facing projections */
  phone?: string;
  graduationYear?: number;
}

export interface IVerificationRequest extends BaseDocument {
  alumnusId: Types.ObjectId;
  /** Protected — never student-visible */
  institutionalIdentifier: string;
  graduationYear?: number;
  status: VerificationStatus;
  submittedAt: Date;
  decidedAt?: Date;
  decidedBy?: Types.ObjectId;
  rejectionReason?: string;
  documents: Types.ObjectId[];
}

export interface IVerificationDocument extends BaseDocument {
  verificationRequestId: Types.ObjectId;
  url?: string;
  secureUrl?: string;
  publicId?: string;
  objectKey?: string;
  fileName: string;
  declaredContentType: string;
  detectedContentType?: string;
  sizeBytes: number;
  status: VerificationDocumentStatus;
  validationMessage?: string;
  uploadedAt?: Date;
  validatedAt?: Date;
  scannedAt?: Date;
}

export interface IExpertiseTag extends BaseDocument {
  name: string;
  status: ExpertiseTagStatus;
}

// ── M2: Capacity & Availability ────────────────────────────────────────

export interface IMentorCapacity extends TenantScoped {
  _id: Types.ObjectId;
  alumnusId: Types.ObjectId;
  maxConcurrentMentees: number;
  activeMentees: number;
  acceptingNewMentees: boolean;
  updatedAt: Date;
}

export interface IAvailabilityWindow extends BaseDocument {
  alumnusId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  timezone: string;
}

// ── M3: Student Career Profile ─────────────────────────────────────────

export interface IStudentProfile extends BaseDocument {
  userId: Types.ObjectId;
  avatarUrl?: string;
  videoCvUrl?: string;
  resumeUrl?: string;
  interests: string[];
  targetRoles: string[];
  targetIndustries: string[];
  graduationYear?: number;
  major?: string;
  degree?: string;
  gpa?: number;
}

export interface ICareerGoal extends BaseDocument {
  studentProfileId: Types.ObjectId;
  title: string;
  description?: string;
  status: CareerGoalStatus;
}

// ── M4: Matching ───────────────────────────────────────────────────────

export interface IMatchScore extends TenantScoped {
  _id: Types.ObjectId;
  studentProfileId: Types.ObjectId;
  alumnusId: Types.ObjectId;
  score: number;
  rank: number;
  reasons: string[];
  generatedAt: Date;
  matchingVersion?: string;
}

// ── M5: Requests & Mentorship ──────────────────────────────────────────

export interface IMentorshipRequest extends BaseDocument {
  studentUserId: Types.ObjectId;
  mentorAlumnusId: Types.ObjectId;
  status: MentorshipRequestStatus;
  message?: string;
  declineReason?: string;
  expiresAt: Date;
  respondedAt?: Date;
  respondedBy?: Types.ObjectId;
}

export interface IMentorship extends BaseDocument {
  studentUserId: Types.ObjectId;
  mentorAlumnusId: Types.ObjectId;
  sourceRequestId: Types.ObjectId;
  status: MentorshipStatus;
  startedAt: Date;
  endedAt?: Date;
}

// ── M6: Scheduling & Sessions ──────────────────────────────────────────

export interface ISession extends BaseDocument {
  mentorshipId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  timezone: string;
  status: SessionStatus;
  calendarProvider: CalendarProvider;
  calendarEventId?: string;
  meetingUrl?: string;
  notes?: string;
}

// ── M7: Goals, Actions & Feedback ──────────────────────────────────────

export interface IGoal extends BaseDocument {
  mentorshipId: Types.ObjectId;
  title: string;
  description?: string;
  status: GoalStatus;
  dueDate?: Date;
  createdBy: Types.ObjectId;
}

export interface IActionItem extends BaseDocument {
  mentorshipId: Types.ObjectId;
  goalId: Types.ObjectId;
  title: string;
  status: ActionItemStatus;
  dueDate?: Date;
  createdBy: Types.ObjectId;
  completedAt?: Date;
}

export interface IFeedback extends TenantScoped {
  _id: Types.ObjectId;
  mentorshipId: Types.ObjectId;
  submittedBy: Types.ObjectId;
  submittedByRole: UserRole;
  rating: number;
  comments?: string;
  submittedAt: Date;
}

// ── M8: Engagement ─────────────────────────────────────────────────────

export interface IEngagementSnapshot extends TenantScoped {
  _id: Types.ObjectId;
  mentorshipId: Types.ObjectId;
  status: EngagementStatus;
  lastMeaningfulActivityAt?: Date;
  assessedAt: Date;
  criteriaVersion?: string;
  nudgeIssuedAt?: Date;
}

// ── M9: Messaging ──────────────────────────────────────────────────────

export interface IMessage extends TenantScoped {
  _id: Types.ObjectId;
  mentorshipId: Types.ObjectId;
  senderUserId: Types.ObjectId;
  senderRole: UserRole;
  message: string;
  sentAt: Date;
}

// ── M10: Analytics & Audit ─────────────────────────────────────────────

export interface IProgrammeConfiguration extends BaseDocument {
  version: number;
  matchingWeights: Record<string, unknown>;
  requestPolicy: Record<string, unknown>;
  engagementSettings: Record<string, unknown>;
  effectiveFrom: Date;
  updatedBy: Types.ObjectId;
}

export interface IPlacementOutcome extends BaseDocument {
  studentUserId: Types.ObjectId;
  outcomeType: string;
  occurredAt: Date;
  sourceSystem: string;
  externalReference?: string;
}

export interface IAuditEntry extends TenantScoped {
  _id: Types.ObjectId;
  actorUserId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId: Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface IOutboxEvent extends BaseDocument {
  eventType: string;
  aggregateType: string;
  aggregateId: Types.ObjectId;
  deduplicationKey: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  availableAt: Date;
  attempts: number;
  lastError?: string;
  dispatchedAt?: Date;
}

// ── Media & Career Assets ──────────────────────────────────────────────

export interface ImageVariant {
  size: string;
  url: string;
  secureUrl?: string;
  publicId?: string;
  objectKey?: string;
  width: number;
  height: number;
}

export interface IUserMediaAsset extends BaseDocument {
  userId: Types.ObjectId;
  assetType: MediaAssetType;
  url: string;
  secureUrl?: string;
  publicId: string;
  format?: string;
  resourceType?: string;
  folder?: string;
  thumbnailUrl?: string;
  objectKey?: string;
  cdnUrl?: string;
  fileName: string;
  declaredContentType: string;
  detectedContentType?: string;
  sizeBytes: number;
  dimensions?: { width: number; height: number };
  status: MediaAssetStatus;
  variants: ImageVariant[];
  uploadedAt?: Date;
  processedAt?: Date;
}

export interface VideoMeta {
  duration: number;
  resolution: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  thumbnailKey?: string;
  transcodedKey?: string;
  width?: number;
  height?: number;
}

export interface ICareerAsset extends BaseDocument {
  userId: Types.ObjectId;
  assetType: CareerAssetType;
  url: string;
  secureUrl?: string;
  publicId: string;
  format?: string;
  resourceType?: string;
  folder?: string;
  objectKey?: string;
  fileName: string;
  declaredContentType: string;
  detectedContentType?: string;
  sizeBytes: number;
  status: CareerAssetStatus;
  title?: string;
  description?: string;
  videoMeta?: VideoMeta;
  validationMessage?: string;
  uploadedAt?: Date;
  processedAt?: Date;
}
