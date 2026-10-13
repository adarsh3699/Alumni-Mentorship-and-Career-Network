/**
 * P11 Database Enums
 * All enumerated values used across the database layer.
 * Source: docs/Database_Design.md
 */

// ── Core Identity ──────────────────────────────────────────────────────

export const UserRole = {
  STUDENT: 'student',
  ALUMNI_MENTOR: 'alumni_mentor',
  ALUMNI_RELATIONS_OFFICER: 'alumni_relations_officer',
  PLACEMENT_OFFICER: 'placement_officer',
  ADMINISTRATOR: 'administrator',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const InstitutionStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type InstitutionStatus = (typeof InstitutionStatus)[keyof typeof InstitutionStatus];

// ── M1: Alumni Verification & Profile ──────────────────────────────────

export const VerificationStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const VerificationDocumentStatus = {
  PENDING_UPLOAD: 'pending_upload',
  VALIDATING: 'validating',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type VerificationDocumentStatus =
  (typeof VerificationDocumentStatus)[keyof typeof VerificationDocumentStatus];

export const ExpertiseTagStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type ExpertiseTagStatus = (typeof ExpertiseTagStatus)[keyof typeof ExpertiseTagStatus];

// ── M3: Student Career Profile ─────────────────────────────────────────

export const CareerGoalStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;
export type CareerGoalStatus = (typeof CareerGoalStatus)[keyof typeof CareerGoalStatus];

// ── M5: Requests & Mentorship ──────────────────────────────────────────

export const MentorshipRequestStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;
export type MentorshipRequestStatus =
  (typeof MentorshipRequestStatus)[keyof typeof MentorshipRequestStatus];

export const MentorshipStatus = {
  ACTIVE: 'active',
  ENDED: 'ended',
} as const;
export type MentorshipStatus = (typeof MentorshipStatus)[keyof typeof MentorshipStatus];

// ── M6: Scheduling & Sessions ──────────────────────────────────────────

export const SessionStatus = {
  PROPOSED: 'proposed',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

// ── M7: Goals, Actions & Feedback ──────────────────────────────────────

export const GoalStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;
export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const ActionItemStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
} as const;
export type ActionItemStatus = (typeof ActionItemStatus)[keyof typeof ActionItemStatus];

// ── M8: Engagement ─────────────────────────────────────────────────────

export const EngagementStatus = {
  HEALTHY: 'healthy',
  AT_RISK: 'at_risk',
  INACTIVE: 'inactive',
} as const;
export type EngagementStatus = (typeof EngagementStatus)[keyof typeof EngagementStatus];

// ── Cross-cutting: Outbox ──────────────────────────────────────────────

export const OutboxEventStatus = {
  PENDING: 'pending',
  DISPATCHED: 'dispatched',
  FAILED: 'failed',
} as const;
export type OutboxEventStatus = (typeof OutboxEventStatus)[keyof typeof OutboxEventStatus];

// ── Media & Career Assets ──────────────────────────────────────────────

export const MediaAssetType = {
  PROFILE_PICTURE: 'profile_picture',
  COVER_PHOTO: 'cover_photo',
} as const;
export type MediaAssetType = (typeof MediaAssetType)[keyof typeof MediaAssetType];

export const MediaAssetStatus = {
  PENDING_UPLOAD: 'pending_upload',
  PROCESSING: 'processing',
  ACTIVE: 'active',
  REPLACED: 'replaced',
} as const;
export type MediaAssetStatus = (typeof MediaAssetStatus)[keyof typeof MediaAssetStatus];

export const CareerAssetType = {
  VIDEO_CV: 'video_cv',
  RESUME: 'resume',
  PORTFOLIO_ITEM: 'portfolio_item',
} as const;
export type CareerAssetType = (typeof CareerAssetType)[keyof typeof CareerAssetType];

export const CareerAssetStatus = {
  PENDING_UPLOAD: 'pending_upload',
  PROCESSING: 'processing',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  REJECTED: 'rejected',
} as const;
export type CareerAssetStatus = (typeof CareerAssetStatus)[keyof typeof CareerAssetStatus];

// ── Calendar Providers ─────────────────────────────────────────────────

export const CalendarProvider = {
  NONE: 'none',
  GOOGLE: 'google',
  OUTLOOK: 'outlook',
} as const;
export type CalendarProvider = (typeof CalendarProvider)[keyof typeof CalendarProvider];
