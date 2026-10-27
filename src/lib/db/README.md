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

# Cloudinary (Images, Video CVs & Documents)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=p11-alumni
CLOUDINARY_CLOUD_NAME=p11-alumni
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
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
│   ├── query-helpers.ts          # Pagination, sort, and tenant scoping
│   └── cloudinary.ts             # Transformations, video thumbnails & signed upload helpers
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

## Media & Document Storage Architecture (Cloudinary + MongoDB)

### Why Cloudinary + MongoDB URL Storage?

Binary assets (high-resolution profile avatars, 90-second Video CVs, PDF resumes, degree verification certificates) **must never be stored as BSON blobs in MongoDB**. Doing so inflates document sizes, exhausts WiredTiger database memory cache, and risks exceeding MongoDB's 16MB document boundary.

Instead, P11 pairs **Cloudinary** (as the dedicated media processing & CDN cloud) with **MongoDB** (storing secure HTTPS URLs, public IDs, and transformation metadata):

1. **Optimized Media Hosting & CDN**: Images and videos are hosted on Cloudinary's multi-CDN infrastructure with auto-compression (`q_auto`) and modern formats (`f_auto` → WebP/AVIF).
2. **On-The-Fly Face-Detection Cropping**: Profile avatars automatically detect human faces (`c_thumb,g_face,w_200,h_200`) without manual cropping.
3. **Automated Video Processing**: 90-second Video CVs benefit from automated thumbnail extraction (`so_0`), streaming optimization (`sp_auto`), and adaptive bitrate delivery (HLS / `.m3u8`).
4. **Zero-Join Direct Embedding**:
   - `Alumnus.avatarUrl`: Stored directly on the alumni document so student discovery cards load instantaneously without joining `UserMediaAsset`.
   - `StudentProfile.avatarUrl`, `videoCvUrl`, `resumeUrl`: Stored directly on student profiles for 0-latency access.
   - `User.avatarUrl`: Stored directly on User for top-level navigation headers.
5. **Authoritative Media Ledger**: `UserMediaAsset` and `CareerAsset` collections maintain audit logs, replaced statuses, and multi-resolution variants.

```
┌──────────┐             ┌─────────────────────────┐             ┌───────────────────┐
│  Client  │ ── (1) ───> │   Next.js API Route     │ ── (2) ───> │  Cloudinary SDK   │
│ (Browser)│ <── (3) ─── │ (Issues Signed Params)  │             │  (Signature Gen)  │
└──────────┘             └─────────────────────────┘             └───────────────────┘
     │
     │ (4) Direct Upload (POST multipart)
     ▼
┌──────────────┐
│  Cloudinary  │ ── (5) Returns: secure_url, public_id, duration, format
└──────────────┘
     │
     ▼
┌─────────────────────────┐             ┌────────────────────────────────────────────────────────┐
│   Next.js API Route /   │ ── (6) ───> │ UserMediaAssetRepository.saveCloudinaryAsset(...) /   │
│   Server Action         │             │ CareerAssetRepository.saveCloudinaryVideoCV(...)       │
└─────────────────────────┘             └────────────────────────────────────────────────────────┘
                                                                    │
                                                                    ▼ Stores in MongoDB:
                                                • UserMediaAsset: status: 'active', url, publicId
                                                • Alumnus: avatarUrl directly embedded
                                                • StudentProfile: videoCvUrl, resumeUrl embedded
```

### 1. Profile Pictures & Avatars (`UserMediaAssetRepository`)

When a user uploads a new profile photo via Cloudinary, save the asset metadata and synchronize the URL:

```ts
import { UserMediaAssetRepository, MediaAssetType } from '@/lib/db';

// 1. After upload completes on Cloudinary, save metadata to MongoDB:
const mediaAsset = await UserMediaAssetRepository.saveCloudinaryAsset(institutionId, userId, {
  assetType: MediaAssetType.PROFILE_PICTURE,
  url: 'https://res.cloudinary.com/p11-alumni/image/upload/c_fill,w_512,h_512,g_face,q_auto,f_auto/p11/lpu/avatars/alumni/user_123.jpg',
  secureUrl: 'https://res.cloudinary.com/p11-alumni/image/upload/c_fill,w_512,h_512,g_face,q_auto,f_auto/p11/lpu/avatars/alumni/user_123.jpg',
  publicId: 'p11/lpu/avatars/alumni/user_123',
  format: 'jpg',
  resourceType: 'image',
  fileName: 'profile_photo.jpg',
  sizeBytes: 145000,
  dimensions: { width: 512, height: 512 },
  thumbnailUrl: 'https://res.cloudinary.com/p11-alumni/image/upload/c_thumb,w_150,h_150,g_face,q_auto,f_auto/p11/lpu/avatars/alumni/user_123.jpg',
});

// Behind the scenes, saveCloudinaryAsset automatically:
// - Sets status: 'active'
// - Deprecates previous avatars (status: 'replaced')
// - Updates avatarUrl on User, Alumnus, and StudentProfile documents!
```

### 2. Video CVs & Resumes (`CareerAssetRepository`)

Store Video CVs with duration, streaming URLs, and auto-generated poster frames:

```ts
import { CareerAssetRepository } from '@/lib/db';

// Register Video CV in MongoDB:
const videoAsset = await CareerAssetRepository.saveCloudinaryVideoCV(institutionId, userId, {
  url: 'https://res.cloudinary.com/p11-alumni/video/upload/q_auto,f_auto/p11/lpu/video-cvs/user_456/pitch.mp4',
  secureUrl: 'https://res.cloudinary.com/p11-alumni/video/upload/q_auto,f_auto/p11/lpu/video-cvs/user_456/pitch.mp4',
  publicId: 'p11/lpu/video-cvs/user_456/pitch',
  format: 'mp4',
  fileName: 'aarav_video_pitch.mp4',
  sizeBytes: 15400000,
  title: 'Aarav Gupta — 90-Second Systems Engineering Pitch',
  description: 'Highlighting Distributed Systems capstone and Raft consensus implementation.',
  videoMeta: {
    duration: 90,
    resolution: '1080p',
    thumbnailUrl: 'https://res.cloudinary.com/p11-alumni/video/upload/so_0,c_fill,w_640,h_360/p11/lpu/video-cvs/user_456/pitch.jpg',
    playbackUrl: 'https://res.cloudinary.com/p11-alumni/video/upload/sp_auto/p11/lpu/video-cvs/user_456/pitch.m3u8',
    width: 1920,
    height: 1080,
  },
});

// StudentProfile.videoCvUrl is automatically updated with the secure video URL!
```

### 3. Dynamic On-The-Fly Transformations (`buildCloudinaryImageUrl`)

Use built-in transformation helpers to dynamically build responsive image variants or video thumbnails:

```ts
import {
  buildCloudinaryImageUrl,
  buildCloudinaryVideoThumbnail,
  buildCloudinaryVideoUrl,
} from '@/lib/db';

// 1. Generate circular avatar with face detection:
const circleAvatar = buildCloudinaryImageUrl('p11/lpu/avatars/alumni/user_123', {
  width: 120,
  height: 120,
  crop: 'thumb',
  gravity: 'face',
  radius: 'max',
  format: 'auto',
  quality: 'auto',
});

// 2. Generate video poster frame capture at second 2:
const videoPoster = buildCloudinaryVideoThumbnail('p11/lpu/video-cvs/user_456/pitch', {
  startOffset: 2,
  width: 640,
  height: 360,
  crop: 'fill',
  format: 'jpg',
});

// 3. Generate adaptive bitrate streaming video:
const streamingUrl = buildCloudinaryVideoUrl('p11/lpu/video-cvs/user_456/pitch', {
  format: 'm3u8',
  streamingProfile: 'auto',
});
```

### 4. Client-Side Signed Direct Uploads (`generateCloudinaryUploadSignature`)

To let client browsers upload directly to Cloudinary without streaming huge files through your Next.js server:

```ts
import { generateCloudinaryUploadSignature } from '@/lib/db';

// In a Next.js Server Action / API Route:
export async function getUploadSignature() {
  const params = {
    folder: 'p11/lpu/video-cvs',
    resource_type: 'video',
  };

  const signed = generateCloudinaryUploadSignature(params);
  return Response.json(signed);
  // Returns: { signature, timestamp, apiKey, cloudName }
}
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

### Media & Career Assets (Cloudinary)

| Repository | Key Methods | Description |
|---|---|---|
| `UserMediaAssetRepository` | `saveCloudinaryAsset()`, `findActiveAvatar()`, `findByPublicId()`, `deprecatePreviousAvatars()` | Cloudinary profile photos, avatars & cover photos |
| `CareerAssetRepository` | `saveCloudinaryVideoCV()`, `saveCloudinaryResume()`, `findActiveVideoCV()`, `findActiveResume()` | Video CVs (HLS/thumbnails) & Resumes (PDFs) |

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
