/**
 * P11 Models — Barrel Export
 *
 * Import all models from this single file to ensure they are registered
 * with Mongoose before any query is executed.
 *
 * Usage:
 *   import { Alumnus, User, MentorCapacity } from '@/lib/db/models';
 */

export { Institution } from './institution.model';
export { User } from './user.model';
export { Alumnus, ALUMNUS_STUDENT_SAFE_PROJECTION } from './alumnus.model';
export { VerificationRequest } from './verification-request.model';
export { VerificationDocument } from './verification-document.model';
export { ExpertiseTag } from './expertise-tag.model';
export { MentorCapacity } from './mentor-capacity.model';
export { AvailabilityWindow } from './availability-window.model';
export { StudentProfile } from './student-profile.model';
export { CareerGoal } from './career-goal.model';
export { MatchScore } from './match-score.model';
export { MentorshipRequest } from './mentorship-request.model';
export { Mentorship } from './mentorship.model';
export { Session } from './session.model';
export { Goal } from './goal.model';
export { ActionItem } from './action-item.model';
export { Feedback } from './feedback.model';
export { EngagementSnapshot } from './engagement-snapshot.model';
export { Message } from './message.model';
export { ProgrammeConfiguration } from './programme-configuration.model';
export { PlacementOutcome } from './placement-outcome.model';
export { AuditEntry } from './audit-entry.model';
export { OutboxEvent } from './outbox-event.model';
export { UserMediaAsset } from './user-media-asset.model';
export { CareerAsset } from './career-asset.model';
