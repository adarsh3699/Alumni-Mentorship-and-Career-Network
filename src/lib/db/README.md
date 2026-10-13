# P11 Database Layer

> Authoritative data access layer for the Alumni Mentorship & Career Network platform.
> **MongoDB 7+ • Mongoose ODM • TypeScript • Repository Pattern • Multi-Tenant Isolation**

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Core Invariants & Rules](#core-invariants--rules)
- [Media & Document Storage Architecture](#media--document-storage-architecture)
- [Module Repository Reference](#module-repository-reference)
- [Transaction & Concurrency Safety](#transaction--concurrency-safety)
- [Database Seeding & Demo Data](#database-seeding--demo-data)
- [Health Checks & Diagnostics](#health-checks--diagnostics)
- [Adding New Entities / Repositories](#adding-new-entities--repositories)

---

## Quick Start

### 1. Configure Environment

Copy `.env.example` to `.env.local` and set your MongoDB URI:

```bash
cp .env.example .env.local
```

```env
MONGODB_URI=mongodb://localhost:27017/p11_alumni_mentorship
```

### 2. Run Database Seed (Populates 50 Verified Alumni & Demo Data)

```bash
npm run db:seed
```

### 3. Import and Query

```ts
import { connectDB, AlumnusRepository, MentorCapacityRepository } from '@/lib/db';

export async function GET(request: Request) {
  // Always connect first (safe cached singleton)
  await connectDB();

  // Student discovery view: automatically strips private email & phone
  const alumni = await AlumnusRepository.findVerifiedForStudentView(institutionId, {
    page: 1,
    limit: 20,
  });

  return Response.json(alumni);
}
```

---

## Architecture Overview

```
src/lib/db/
├── index.ts                      # ← Single import entry point for application code
├── connection.ts                 # MongoDB singleton connection & health check
│
├── types/
│   ├── index.ts                  # Document interfaces & FilterQuery
│   └── enums.ts                  # Role & lifecycle enumerations
│
├── models/                       # 25 registered Mongoose schemas & indexes
│   ├── index.ts                  # Barrel export
│   ├── institution.model.ts      # Multi-tenant institution scope
│   ├── user.model.ts             # University SSO identity & role
│   ├── alumnus.model.ts          # Alumni profile (enforces PII privacy projection)
│   ├── verification-request.model.ts
│   ├── verification-document.model.ts # Document metadata (binaries in S3)
│   ├── expertise-tag.model.ts    # Taxonomy & autocomplete
│   ├── mentor-capacity.model.ts  # Concurrency-critical capacity state
│   ├── availability-window.model.ts
│   ├── student-profile.model.ts  # Student career profile & academic info
│   ├── career-goal.model.ts      # Target quarters & student objectives
│   ├── match-score.model.ts      # Derived matching ranking snapshots
│   ├── mentorship-request.model.ts
│   ├── mentorship.model.ts       # Active relationships
│   ├── session.model.ts          # Mentoring events & calendar integration
│   ├── goal.model.ts             # Mentoring milestone tracking
│   ├── action-item.model.ts      # Relationship action tasks & due dates
│   ├── feedback.model.ts         # Post-session reviews & ratings
│   ├── engagement-snapshot.model.ts # Health assessment & at-risk detection
│   ├── message.model.ts          # Relationship-scoped communication
│   ├── programme-configuration.model.ts # Versioned admin policies
│   ├── placement-outcome.model.ts # University SIS placement data
│   ├── audit-entry.model.ts      # Append-only security audit trail
│   ├── outbox-event.model.ts     # Durable asynchronous event outbox
│   ├── user-media-asset.model.ts # Avatars & profile pictures
│   └── career-asset.model.ts     # Video CVs, Resumes, and Portfolios
│
├── repositories/                 # Data access layer (Tenant-scoped BaseRepository)
│   ├── index.ts                  # Master barrel export
│   ├── base.repository.ts        # Generic CRUD operations with tenant filter
│   ├── core/                     # Institution & User
│   ├── m1/                       # Alumni, Verification, Documents, Taxonomy
│   ├── m2/                       # Capacity & Availability
│   ├── m3/                       # Student Profile & Career Goals
│   ├── m4/                       # Matching & Recommendations
│   ├── m5/                       # Mentorship Requests & Relationships
│   ├── m6/                       # Scheduling & Sessions
│   ├── m7/                       # Goals, Actions & Feedback
│   ├── m8/                       # Engagement Analytics
│   ├── m9/                       # Messaging
│   ├── m10/                      # Policy, Placement, Audit, Outbox
│   └── media/                    # Avatars, Video CVs, Resumes
│
├── utils/
│   ├── index.ts
│   ├── transaction.ts            # Atomic session & transaction runner
│   └── query-helpers.ts          # Pagination, sort, and tenant scoping
│
└── seed/
    ├── data.ts                   # 50 realistic alumni profiles & demo fixtures
    └── index.ts                  # Idempotent seed runner
```

---

## Core Invariants & Rules

### 1. Multi-Tenant Scoping (`institutionId`)

Every domain query and update MUST include `institutionId`. The `BaseRepository` automatically applies `tenantFilter(institutionId, ...)` to every find, update, count, and delete operation to prevent accidental cross-tenant data leakage.

### 2. Student Privacy Protection (PII)

Alumni email addresses and phone numbers are strictly private and may never be leaked to students.
- `AlumnusRepository.findVerifiedForStudentView()` applies `ALUMNUS_STUDENT_SAFE_PROJECTION`.
- `AlumnusRepository.searchForStudentView()` applies `ALUMNUS_STUDENT_SAFE_PROJECTION`.
- Full contact details are accessible ONLY by authenticated staff via `AlumnusRepository.findByVerificationStatus()`.

### 3. Concurrency-Critical Capacity Invariant

Mentors have strict concurrent mentee limits (`maxConcurrentMentees`). To prevent race conditions during high-volume acceptance bursts:
- **Never** do read-then-write updates.
- **Always** use `MentorCapacityRepository.atomicReserveSlot()`. It executes an atomic MongoDB find-and-modify condition:
  `{ activeMentees: { $lt: maxConcurrentMentees }, acceptingNewMentees: true }` and increments in one step.
- When a mentorship ends, call `MentorCapacityRepository.atomicReleaseSlot()` inside the same transaction.

---

## Media & Document Storage Architecture

### Why NoSQL + Object Storage?

Binary files (PDF verification certificates, profile avatars, high-definition Video CVs) **must never be stored as BSON blobs in MongoDB**. Doing so inflates document sizes, slows down database memory cache (WiredTiger), and risks hitting MongoDB's 16MB document limit.

Instead, P11 follows the industry-standard **Presigned URL + MongoDB Metadata Pattern**:

```
┌──────────┐             ┌─────────────────────┐             ┌───────────────────┐
│  Client  │ ── (1) ───> │  API Route Handler  │ ── (2) ───> │ UserMediaAsset /  │
│ (Browser)│             │  (Presigned URL Gen)│             │ CareerAsset Repo  │
└──────────┘             └─────────────────────┘             └───────────────────┘
     │                              │                                  │
     │ (3) Direct PUT               │ (Issues S3 Presigned URL)        │ (Records status:
     ▼                              ▼                                  │  PENDING_UPLOAD)
┌──────────┐                                                           │
│  AWS S3  │                                                           │
│    or    │ ── (4) S3 Event / Webhook ──> ┌─────────────────────────┐ │
│ Cloudflare│                              │ Background Worker /     │ │
│    R2    │ <─ (5) Confirm Upload ─────── │ confirmUpload() Handler │─┘
└──────────┘                               └─────────────────────────┘
```

### 1. Profile Pictures & Avatars (`UserMediaAssetRepository`)

```ts
import { UserMediaAssetRepository, MediaAssetType } from '@/lib/db';

// 1. When user initiates upload, record intent in DB:
const asset = await UserMediaAssetRepository.initiateUpload(institutionId, userId, {
  assetType: MediaAssetType.PROFILE_PICTURE,
  objectKey: `avatars/${userId}/${Date.now()}.jpg`,
  fileName: 'profile.jpg',
  declaredContentType: 'image/jpeg',
  sizeBytes: 154000,
});

// 2. Client uploads directly to S3/R2 using presigned URL.

// 3. When upload completes, activate the new avatar and archive previous ones:
await UserMediaAssetRepository.confirmUpload(institutionId, asset._id, {
  cdnUrl: `https://cdn.lpu.in/${asset.objectKey}`,
  detectedContentType: 'image/jpeg',
  dimensions: { width: 512, height: 512 },
});
await UserMediaAssetRepository.deprecatePreviousAvatars(institutionId, userId, asset._id);
```

### 2. Video CVs & Resumes (`CareerAssetRepository`)

```ts
import { CareerAssetRepository, CareerAssetType } from '@/lib/db';

// Register Video CV metadata:
const videoAsset = await CareerAssetRepository.initiateUpload(institutionId, userId, {
  assetType: CareerAssetType.VIDEO_CV,
  objectKey: `video-cvs/${userId}/intro.mp4`,
  fileName: 'alex_career_pitch.mp4',
  declaredContentType: 'video/mp4',
  sizeBytes: 25000000,
  title: 'Alex Kim — 90s Career Pitch',
});

// After background transcoding completes:
await CareerAssetRepository.updateVideoTranscoding(institutionId, videoAsset._id, {
  duration: 90,
  resolution: '1080p',
  thumbnailKey: `video-cvs/${userId}/thumb.jpg`,
  transcodedKey: `video-cvs/${userId}/hls/manifest.m3u8`,
});
```

### 3. Verification Documents (`VerificationDocumentRepository`)

Verification evidence submitted by alumni (e.g. graduation certificates) is stored in a quarantined S3 bucket until scanned:

```ts
import { VerificationDocumentRepository } from '@/lib/db';

// After virus scanner finishes:
await VerificationDocumentRepository.markApproved(
  institutionId,
  documentId,
  'application/pdf'
);
```

---

## Module Repository Reference

### Core Identity & Institution

| Repository | Key Methods | Description |
|---|---|---|
| `InstitutionRepository` | `findByCode()`, `findAllActive()` | Multi-tenant university administration |
| `UserRepository` | `findByExternalId()`, `findByRole()`, `findOrCreate()` | SSO user identity & role mapping |

### M1 — Alumni Verification & Profile

| Repository | Key Methods | Description |
|---|---|---|
| `AlumnusRepository` | `findVerifiedForStudentView()`, `searchForStudentView()`, `updateVerificationStatus()` | Alumni profiles with PII protection |
| `VerificationRequestRepository` | `findPendingForReview()`, `recordDecision()` | Verification lifecycle review |
| `VerificationDocumentRepository` | `findByRequestId()`, `markApproved()`, `markRejected()` | Proof documents metadata |
| `ExpertiseTagRepository` | `findAllActive()`, `searchByName()`, `findOrCreateMany()` | Taxonomy search & autocomplete |

### M2 — Capacity & Availability

| Repository | Key Methods | Description |
|---|---|---|
| `MentorCapacityRepository` | ⚠️ `atomicReserveSlot()`, ⚠️ `atomicReleaseSlot()`, `hasAvailableCapacity()` | Concurrency-safe mentee limit enforcement |
| `AvailabilityWindowRepository` | `findUpcoming()`, `findOverlapping()`, `replaceAll()` | Mentor calendar availability |

### M3 — Student Career Profile

| Repository | Key Methods | Description |
|---|---|---|
| `StudentProfileRepository` | `findByUserId()`, `upsertByUserId()` | Student academics, GPA, target industries |
| `CareerGoalRepository` | `findByStudentProfile()` | Student career milestones & target quarters |

### M4 — Matching & Ranking

| Repository | Key Methods | Description |
|---|---|---|
| `MatchScoreRepository` | `findTopMatchesForStudent()`, `replaceScoresForStudent()`, `deleteOlderThan()` | Recommendation engine score snapshots |

### M5 — Requests & Mentorship

| Repository | Key Methods | Description |
|---|---|---|
| `MentorshipRequestRepository` | `findByMentor()`, `findByStudent()`, `acceptRequest()`, `declineRequest()` | Student-to-mentor request lifecycle |
| `MentorshipRepository` | `findActiveByMentor()`, `findActiveByStudent()`, `createFromAcceptedRequest()`, `endMentorship()` | Active mentoring relationships |

### M6 — Scheduling & Sessions

| Repository | Key Methods | Description |
|---|---|---|
| `SessionRepository` | `findByMentorship()`, `findUpcoming()`, `transitionStatus()` | Session scheduling, Zoom/Meet links |

### M7 — Goals, Actions & Feedback

| Repository | Key Methods | Description |
|---|---|---|
| `GoalRepository` | `findByMentorship()`, `countByStatus()` | Mentorship milestone goals |
| `ActionItemRepository` | `findByGoal()`, `findOverdueByMentorship()`, `markCompleted()` | Actionable tasks & due dates |
| `FeedbackRepository` | `findByMentorship()`, `averageRatingForMentor()` | Post-session reviews & ratings |

### M8 — Engagement

| Repository | Key Methods | Description |
|---|---|---|
| `EngagementSnapshotRepository` | `findLatest()`, `findAtRiskMentorships()` | Periodic engagement scoring |

### M9 — Messaging

| Repository | Key Methods | Description |
|---|---|---|
| `MessageRepository` | `findByMentorship()`, `findLastMessage()`, `countSince()` | In-app relationship chat history |

### M10 — Policy, Placement & Audit

| Repository | Key Methods | Description |
|---|---|---|
| `ProgrammeConfigurationRepository` | `findCurrentEffective()`, `createNextVersion()`, `findHistory()` | Versioned matching weights & policies |
| `PlacementOutcomeRepository` | `findByStudent()`, `upsertFromExternalSource()`, `getOutcomeCountsByType()` | University SIS placement correlation |
| `AuditEntryRepository` | `log()`, `findByTarget()`, `findByActor()` | Append-only privileged action log |
| `OutboxEventRepository` | `findPendingForDispatch()`, `markDispatched()`, `markFailed()` | Durable outbox event dispatcher |

### Media & Career Assets

| Repository | Key Methods | Description |
|---|---|---|
| `UserMediaAssetRepository` | `findActiveAvatar()`, `initiateUpload()`, `confirmUpload()`, `deprecatePreviousAvatars()` | Profile photos & avatars |
| `CareerAssetRepository` | `findActiveVideoCV()`, `findActiveResume()`, `initiateUpload()`, `updateVideoTranscoding()` | Video CVs, resumes, portfolio docs |

---

## Transaction & Concurrency Safety

Use `withTransaction` for multi-document atomic operations (e.g., accepting a mentorship request):

```ts
import {
  withTransaction,
  MentorCapacityRepository,
  MentorshipRequestRepository,
  MentorshipRepository,
} from '@/lib/db';

const mentorship = await withTransaction(async (session) => {
  // 1. Atomically reserve a slot (fails if mentor is at max concurrent capacity)
  const capacity = await MentorCapacityRepository.atomicReserveSlot(
    institutionId,
    mentorAlumnusId,
    session
  );
  if (!capacity) {
    throw new Error('Mentor capacity is currently full');
  }

  // 2. Transition request to accepted
  await MentorshipRequestRepository.acceptRequest(institutionId, requestId, session);

  // 3. Create relationship (idempotent via sourceRequestId)
  return MentorshipRepository.createFromAcceptedRequest(
    {
      institutionId,
      studentUserId,
      mentorAlumnusId,
      sourceRequestId: requestId,
    },
    session
  );
});
```

---

## Database Seeding & Demo Data

The platform includes a complete, idempotent seeder complying with **SRS §13 (>= 50 Alumni Profiles)**:

```bash
# Run seeder
npm run db:seed

# Force fresh wipe and re-seed
npx tsx src/lib/db/seed/index.ts --clean
```

The seed dataset generates:
- **1 Institution**: Lovely Professional University (`LPU`)
- **3 Staff Accounts**: Administrator, Alumni Relations Officer, Placement Officer (`@lpu.in`)
- **25 CSE Taxonomy Tags** across Distributed Systems, System Design, AI/ML, Cloud/DevOps, Cybersecurity, Full Stack, and Mobile
- **50 Alumni Profiles (CSE Specialists)**:
  - 42 Verified mentors (Google, Microsoft, AWS, Meta, Goldman Sachs, Zomato, Swiggy, Flipkart, Uber, Snowflake, etc.)
  - 5 Pending verification requests with uploaded credentials
  - 3 Rejected submissions with audit decision reasons
- **10 CSE Student Profiles** with career goals (SDE placements, Competitive Programming, GATE/Research), GPAs, and target tech industries
- **Resumes and Video CV metadata entries**
- **Mentorship Requests, Active Mentorships, Scheduled Sessions, Goals, and Feedback**
- **Programme Configuration (v1)** with matching weights

---

## Health Checks & Diagnostics

To verify database responsiveness in Next.js health check endpoints (e.g. `/api/health`):

```ts
import { checkDatabaseHealth } from '@/lib/db';

export async function GET() {
  const health = await checkDatabaseHealth();
  return Response.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
  });
}
```

Sample output:
```json
{
  "status": "healthy",
  "readyState": 1,
  "databaseName": "p11_alumni_mentorship",
  "latencyMs": 3
}
```
