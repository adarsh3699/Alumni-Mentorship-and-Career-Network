/**
 * P11 Database Seed Runner
 *
 * Idempotent seeder that populates:
 * - Multi-tenant institution & Core roles (Admin, ARO, Placement)
 * - 50 Alumni Profiles (Verified, Pending, Rejected)
 * - Mentor Capacities & Availability Windows
 * - Student Profiles & Career Goals
 * - Verification Requests & Document Metadata
 * - Mentorship Requests, Mentorships & Sessions
 * - Goals, Action Items & Feedback
 * - Media Assets (Avatars, Resumes, Video CVs)
 * - Programme Configuration & Outbox events
 *
 * Run with:
 *   npx tsx src/lib/db/seed/index.ts
 * Or:
 *   npm run db:seed
 */

import { connectDB, disconnectDB } from '../connection';
import type { IAlumnus, IUser, IStudentProfile } from '../types';
import {
  Institution,
  User,
  Alumnus,
  VerificationRequest,
  VerificationDocument,
  ExpertiseTag,
  MentorCapacity,
  AvailabilityWindow,
  StudentProfile,
  CareerGoal,
  MentorshipRequest,
  Mentorship,
  Session,
  Goal,
  ActionItem,
  Feedback,
  EngagementSnapshot,
  ProgrammeConfiguration,
  UserMediaAsset,
  CareerAsset,
} from '../models';
import {
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
  MediaAssetType,
  MediaAssetStatus,
  CareerAssetType,
  CareerAssetStatus,
  CalendarProvider,
} from '../types/enums';
import {
  SEED_INSTITUTION,
  SEED_EXPERTISE_TAGS,
  SEED_ALUMNI_PROFILES,
  SEED_STUDENTS,
} from './data';

export async function seedDatabase(options: { clean?: boolean } = {}) {
  console.log('🌱 Starting P11 Database Seed...\n');
  await connectDB();

  const isClean = options.clean || process.argv.includes('--clean');

  // 1. Institution
  let institution = await Institution.findOne({ code: SEED_INSTITUTION.code });
  if (isClean && institution) {
    console.log('🧹 Cleaning existing institution data...');
    const instId = institution._id;
    await Promise.all([
      User.deleteMany({ institutionId: instId }),
      Alumnus.deleteMany({ institutionId: instId }),
      VerificationRequest.deleteMany({ institutionId: instId }),
      VerificationDocument.deleteMany({ institutionId: instId }),
      ExpertiseTag.deleteMany({ institutionId: instId }),
      MentorCapacity.deleteMany({ institutionId: instId }),
      AvailabilityWindow.deleteMany({ institutionId: instId }),
      StudentProfile.deleteMany({ institutionId: instId }),
      CareerGoal.deleteMany({ institutionId: instId }),
      MentorshipRequest.deleteMany({ institutionId: instId }),
      Mentorship.deleteMany({ institutionId: instId }),
      Session.deleteMany({ institutionId: instId }),
      Goal.deleteMany({ institutionId: instId }),
      ActionItem.deleteMany({ institutionId: instId }),
      Feedback.deleteMany({ institutionId: instId }),
      EngagementSnapshot.deleteMany({ institutionId: instId }),
      ProgrammeConfiguration.deleteMany({ institutionId: instId }),
      UserMediaAsset.deleteMany({ institutionId: instId }),
      CareerAsset.deleteMany({ institutionId: instId }),
      Institution.deleteOne({ _id: instId }),
    ]);
    institution = null;
  }

  if (!institution) {
    institution = await Institution.create({
      name: SEED_INSTITUTION.name,
      code: SEED_INSTITUTION.code,
      status: InstitutionStatus.ACTIVE,
    });
    console.log(`✅ Created Institution: ${institution.name} (${institution.code})`);
  } else {
    console.log(`ℹ️ Institution already exists: ${institution.name} (${institution.code})`);
  }

  const institutionId = institution._id;

  // 2. Core Administrative Users
  const staffUsers = [
    {
      institutionId,
      externalIdentityId: 'sso-lpu-admin-01',
      role: UserRole.ADMINISTRATOR,
      status: UserStatus.ACTIVE,
    },
    {
      institutionId,
      externalIdentityId: 'sso-lpu-aro-01',
      role: UserRole.ALUMNI_RELATIONS_OFFICER,
      status: UserStatus.ACTIVE,
    },
    {
      institutionId,
      externalIdentityId: 'sso-lpu-placement-01',
      role: UserRole.PLACEMENT_OFFICER,
      status: UserStatus.ACTIVE,
    },
  ];

  for (const staff of staffUsers) {
    await User.findOneAndUpdate(
      { institutionId, externalIdentityId: staff.externalIdentityId },
      { $setOnInsert: staff },
      { upsert: true }
    );
  }
  console.log('✅ Core Staff Users seeded (Admin, ARO, Placement Officer)');

  // 3. Expertise Taxonomy Tags
  for (const tagName of SEED_EXPERTISE_TAGS) {
    await ExpertiseTag.findOneAndUpdate(
      { institutionId, name: tagName },
      { $setOnInsert: { institutionId, name: tagName, status: ExpertiseTagStatus.ACTIVE } },
      { upsert: true }
    );
  }
  console.log(`✅ ${SEED_EXPERTISE_TAGS.length} Expertise Taxonomy Tags verified`);

  // 4. Seed 50 Alumni Profiles + User records + Capacities
  console.log(`⏳ Seeding 50 Alumni Profiles...`);
  const seededAlumniDocs: Array<{ alumnus: IAlumnus; input: (typeof SEED_ALUMNI_PROFILES)[0]; user: IUser }> = [];

  for (let i = 0; i < SEED_ALUMNI_PROFILES.length; i++) {
    const input = SEED_ALUMNI_PROFILES[i];
    const ssoId = `sso-alumni-${(i + 1).toString().padStart(3, '0')}`;

    // Upsert User
    const user = await User.findOneAndUpdate(
      { institutionId, externalIdentityId: ssoId },
      {
        $setOnInsert: {
          institutionId,
          externalIdentityId: ssoId,
          role: UserRole.ALUMNI_MENTOR,
          status: UserStatus.ACTIVE,
        },
      },
      { upsert: true, new: true }
    );

    const avatarPublicId = `p11/lpu/avatars/alumni/${user._id}`;
    const avatarUrl = `https://res.cloudinary.com/p11-alumni/image/upload/c_fill,w_512,h_512,g_face,f_auto,q_auto/${avatarPublicId}.jpg`;
    const isVerified = input.verificationStatus === 'verified';

    // Upsert Alumnus Profile
    const alumnus = await Alumnus.findOneAndUpdate(
      { institutionId, email: input.email },
      {
        $set: {
          institutionId,
          userId: user._id,
          name: input.name,
          avatarUrl: isVerified ? avatarUrl : undefined,
          email: input.email,
          phone: input.phone,
          graduationYear: input.graduationYear,
          degree: input.degree,
          major: input.major,
          currentTitle: input.currentTitle,
          currentCompany: input.currentCompany,
          industry: input.industry,
          city: input.city,
          country: input.country,
          bio: input.bio,
          expertise: input.expertise,
          verificationStatus: input.verificationStatus,
          verifiedAt: isVerified ? new Date('2024-01-15') : undefined,
        },
      },
      { upsert: true, new: true }
    );

    if (isVerified) {
      await User.updateOne({ _id: user._id }, { $set: { avatarUrl } });
    }

    // Mentor Capacity
    await MentorCapacity.findOneAndUpdate(
      { institutionId, alumnusId: alumnus._id },
      {
        $set: {
          institutionId,
          alumnusId: alumnus._id,
          maxConcurrentMentees: input.maxCapacity,
          activeMentees: input.activeMentees,
          acceptingNewMentees: input.acceptingMentees,
        },
      },
      { upsert: true }
    );

    // If verified, add availability window and profile avatar
    if (input.verificationStatus === 'verified') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);

      await AvailabilityWindow.findOneAndUpdate(
        { institutionId, alumnusId: alumnus._id },
        {
          $setOnInsert: {
            institutionId,
            alumnusId: alumnus._id,
            startAt: tomorrow,
            endAt: nextMonth,
            timezone: 'Asia/Kolkata',
          },
        },
        { upsert: true }
      );

      // Media Asset: Avatar (Stored on Cloudinary, URL in MongoDB)
      await UserMediaAsset.findOneAndUpdate(
        { institutionId, userId: user._id, assetType: MediaAssetType.PROFILE_PICTURE },
        {
          $setOnInsert: {
            institutionId,
            userId: user._id,
            assetType: MediaAssetType.PROFILE_PICTURE,
            url: avatarUrl,
            secureUrl: avatarUrl,
            publicId: avatarPublicId,
            format: 'jpg',
            resourceType: 'image',
            folder: 'p11/lpu/avatars/alumni',
            thumbnailUrl: `https://res.cloudinary.com/p11-alumni/image/upload/c_thumb,w_150,h_150,g_face,f_auto,q_auto/${avatarPublicId}.jpg`,
            objectKey: `avatars/${institution.code.toLowerCase()}/${user._id}.jpg`,
            cdnUrl: avatarUrl,
            fileName: `${input.name.toLowerCase().replace(/\s+/g, '_')}_avatar.jpg`,
            declaredContentType: 'image/jpeg',
            detectedContentType: 'image/jpeg',
            sizeBytes: 145000,
            status: MediaAssetStatus.ACTIVE,
            dimensions: { width: 512, height: 512 },
            variants: [
              {
                size: 'thumb',
                url: `https://res.cloudinary.com/p11-alumni/image/upload/c_thumb,w_64,h_64,g_face,f_auto,q_auto/${avatarPublicId}.jpg`,
                publicId: avatarPublicId,
                objectKey: `avatars/${user._id}_64.jpg`,
                width: 64,
                height: 64,
              },
              {
                size: 'medium',
                url: `https://res.cloudinary.com/p11-alumni/image/upload/c_fill,w_256,h_256,g_face,f_auto,q_auto/${avatarPublicId}.jpg`,
                publicId: avatarPublicId,
                objectKey: `avatars/${user._id}_256.jpg`,
                width: 256,
                height: 256,
              },
            ],
            uploadedAt: new Date(),
            processedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // If pending or rejected, seed verification request workflow & documents
    if (input.verificationStatus === 'pending' || input.verificationStatus === 'rejected') {
      const verRequest = await VerificationRequest.findOneAndUpdate(
        { institutionId, alumnusId: alumnus._id },
        {
          $set: {
            institutionId,
            alumnusId: alumnus._id,
            status: input.verificationStatus === 'pending' ? VerificationStatus.PENDING : VerificationStatus.REJECTED,
            decisionReason: input.verificationStatus === 'rejected' ? 'Degree verification could not be validated with Registrar record.' : undefined,
            decidedAt: input.verificationStatus === 'rejected' ? new Date() : undefined,
          },
        },
        { upsert: true, new: true }
      );

      const docPublicId = `p11/lpu/verification/${verRequest._id}/degree_proof`;
      const docUrl = `https://res.cloudinary.com/p11-alumni/image/upload/${docPublicId}.pdf`;

      await VerificationDocument.findOneAndUpdate(
        { institutionId, verificationRequestId: verRequest._id },
        {
          $setOnInsert: {
            institutionId,
            verificationRequestId: verRequest._id,
            url: docUrl,
            secureUrl: docUrl,
            publicId: docPublicId,
            objectKey: `verification-evidence/${verRequest._id}/degree_proof.pdf`,
            fileName: 'official_degree_copy.pdf',
            declaredContentType: 'application/pdf',
            detectedContentType: 'application/pdf',
            sizeBytes: 420000,
            status: input.verificationStatus === 'pending' ? VerificationDocumentStatus.VALIDATING : VerificationDocumentStatus.REJECTED,
            uploadedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    seededAlumniDocs.push({ alumnus, input, user });
  }
  console.log(`✅ 50 Alumni Profiles seeded (42 verified, 5 pending, 3 rejected)`);

  // 5. Seed Students, Profiles & Career Goals
  console.log(`⏳ Seeding Students, Profiles & Career Assets...`);
  const seededStudents: Array<{ user: IUser; profile: IStudentProfile; input: (typeof SEED_STUDENTS)[0] }> = [];

  for (let i = 0; i < SEED_STUDENTS.length; i++) {
    const studentInput = SEED_STUDENTS[i];
    const ssoId = `sso-student-${(i + 1).toString().padStart(3, '0')}`;

    const user = await User.findOneAndUpdate(
      { institutionId, externalIdentityId: ssoId },
      {
        $setOnInsert: {
          institutionId,
          externalIdentityId: ssoId,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      },
      { upsert: true, new: true }
    );

    const studentAvatarPublicId = `p11/lpu/avatars/students/${user._id}`;
    const studentAvatarUrl = `https://res.cloudinary.com/p11-alumni/image/upload/c_fill,w_512,h_512,g_face,f_auto,q_auto/${studentAvatarPublicId}.jpg`;
    const studentVideoPublicId = `p11/lpu/video-cvs/${user._id}/pitch`;
    const studentVideoUrl = `https://res.cloudinary.com/p11-alumni/video/upload/q_auto,f_auto/${studentVideoPublicId}.mp4`;
    const studentVideoThumb = `https://res.cloudinary.com/p11-alumni/video/upload/so_0,c_fill,w_640,h_360,q_auto,f_auto/${studentVideoPublicId}.jpg`;
    const studentVideoHls = `https://res.cloudinary.com/p11-alumni/video/upload/sp_auto/${studentVideoPublicId}.m3u8`;
    const studentResumePublicId = `p11/lpu/resumes/${user._id}/resume_2025`;
    const studentResumeUrl = `https://res.cloudinary.com/p11-alumni/image/upload/fl_attachment/${studentResumePublicId}.pdf`;

    await User.updateOne({ _id: user._id }, { $set: { avatarUrl: studentAvatarUrl } });

    const profile = await StudentProfile.findOneAndUpdate(
      { institutionId, userId: user._id },
      {
        $set: {
          institutionId,
          userId: user._id,
          avatarUrl: studentAvatarUrl,
          videoCvUrl: studentVideoUrl,
          resumeUrl: studentResumeUrl,
          graduationYear: studentInput.gradYear,
          major: studentInput.major,
          degree: studentInput.degree,
          gpa: studentInput.gpa,
          targetIndustries: studentInput.targetIndustries,
          interests: studentInput.interests,
        },
      },
      { upsert: true, new: true }
    );

    // Career Goals
    for (const g of studentInput.goals) {
      await CareerGoal.findOneAndUpdate(
        { institutionId, studentProfileId: profile._id, title: g.title },
        {
          $setOnInsert: {
            institutionId,
            studentProfileId: profile._id,
            title: g.title,
            targetQuarter: g.targetQuarter,
            status: CareerGoalStatus.IN_PROGRESS,
          },
        },
        { upsert: true }
      );
    }

    // Student Media: Avatar & Career Asset (Resume + Video CV on Cloudinary)
    await UserMediaAsset.findOneAndUpdate(
      { institutionId, userId: user._id, assetType: MediaAssetType.PROFILE_PICTURE },
      {
        $setOnInsert: {
          institutionId,
          userId: user._id,
          assetType: MediaAssetType.PROFILE_PICTURE,
          url: studentAvatarUrl,
          secureUrl: studentAvatarUrl,
          publicId: studentAvatarPublicId,
          format: 'jpg',
          resourceType: 'image',
          folder: 'p11/lpu/avatars/students',
          thumbnailUrl: `https://res.cloudinary.com/p11-alumni/image/upload/c_thumb,w_150,h_150,g_face,f_auto,q_auto/${studentAvatarPublicId}.jpg`,
          objectKey: `avatars/students/${user._id}.jpg`,
          cdnUrl: studentAvatarUrl,
          fileName: `${studentInput.name.toLowerCase().replace(/\s+/g, '_')}.jpg`,
          declaredContentType: 'image/jpeg',
          detectedContentType: 'image/jpeg',
          sizeBytes: 120000,
          status: MediaAssetStatus.ACTIVE,
          uploadedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Career Asset: Video CV (Cloudinary Video with dynamic thumbnail & HLS)
    await CareerAsset.findOneAndUpdate(
      { institutionId, userId: user._id, assetType: CareerAssetType.VIDEO_CV },
      {
        $setOnInsert: {
          institutionId,
          userId: user._id,
          assetType: CareerAssetType.VIDEO_CV,
          url: studentVideoUrl,
          secureUrl: studentVideoUrl,
          publicId: studentVideoPublicId,
          format: 'mp4',
          resourceType: 'video',
          folder: `p11/lpu/video-cvs/${user._id}`,
          objectKey: `video-cvs/${user._id}/pitch.mp4`,
          fileName: `${studentInput.name.toLowerCase().replace(/\s+/g, '_')}_video_pitch.mp4`,
          declaredContentType: 'video/mp4',
          detectedContentType: 'video/mp4',
          sizeBytes: 15400000,
          status: CareerAssetStatus.ACTIVE,
          title: `${studentInput.name} — 90-Second Career Pitch`,
          description: `Highlighting technical projects in ${studentInput.major} and engineering aspirations.`,
          videoMeta: {
            duration: 90,
            resolution: '1080p',
            thumbnailUrl: studentVideoThumb,
            playbackUrl: studentVideoHls,
            thumbnailKey: `video-cvs/${user._id}/thumb.jpg`,
            transcodedKey: `video-cvs/${user._id}/hls/manifest.m3u8`,
            width: 1920,
            height: 1080,
          },
          uploadedAt: new Date(),
          processedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Career Asset: Resume PDF (Cloudinary Raw/Image asset)
    await CareerAsset.findOneAndUpdate(
      { institutionId, userId: user._id, assetType: CareerAssetType.RESUME },
      {
        $setOnInsert: {
          institutionId,
          userId: user._id,
          assetType: CareerAssetType.RESUME,
          url: studentResumeUrl,
          secureUrl: studentResumeUrl,
          publicId: studentResumePublicId,
          format: 'pdf',
          resourceType: 'raw',
          folder: `p11/lpu/resumes/${user._id}`,
          objectKey: `resumes/${user._id}/resume_2025.pdf`,
          fileName: `${studentInput.name.toLowerCase().replace(/\s+/g, '_')}_Resume.pdf`,
          declaredContentType: 'application/pdf',
          detectedContentType: 'application/pdf',
          sizeBytes: 312000,
          status: CareerAssetStatus.ACTIVE,
          title: 'Primary Technical Resume',
          uploadedAt: new Date(),
        },
      },
      { upsert: true }
    );

    seededStudents.push({ user, profile, input: studentInput });
  }
  console.log(`✅ ${seededStudents.length} Students seeded with Profiles, Goals, Resumes & Video CVs`);

  // 6. Seed Workflow: Mentorship Requests, Mentorships, Sessions, Feedback
  console.log(`⏳ Seeding Mentorship relationships, sessions & goals...`);

  // Pair 1: Aarav Gupta (B.Tech CSE) & Amanpreet Singh (Google Staff SWE)
  const aaravStudent = seededStudents[0];
  const amanpreetAlumnus = seededAlumniDocs[0];

  const req1 = await MentorshipRequest.findOneAndUpdate(
    { institutionId, studentUserId: aaravStudent.user._id, mentorAlumnusId: amanpreetAlumnus.alumnus._id },
    {
      $set: {
        institutionId,
        studentUserId: aaravStudent.user._id,
        mentorAlumnusId: amanpreetAlumnus.alumnus._id,
        message: 'Hello Amanpreet Sir, I am a 3rd year B.Tech CSE student at Lovely Professional University. I loved your talk on distributed storage and consensus protocols! I am preparing for systems engineering and off-campus placements and would deeply value your guidance.',
        status: MentorshipRequestStatus.ACCEPTED,
        decidedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  const mentorship1 = await Mentorship.findOneAndUpdate(
    { institutionId, sourceRequestId: req1._id },
    {
      $set: {
        institutionId,
        studentUserId: aaravStudent.user._id,
        mentorAlumnusId: amanpreetAlumnus.alumnus._id,
        sourceRequestId: req1._id,
        status: MentorshipStatus.ACTIVE,
        startedAt: new Date('2025-01-20'),
      },
    },
    { upsert: true, new: true }
  );

  // Scheduled Upcoming Session
  const sessionStart = new Date();
  sessionStart.setDate(sessionStart.getDate() + 3);
  sessionStart.setHours(15, 0, 0, 0);
  const sessionEnd = new Date(sessionStart);
  sessionEnd.setHours(16, 0, 0, 0);

  await Session.findOneAndUpdate(
    { institutionId, mentorshipId: mentorship1._id, startAt: sessionStart },
    {
      $setOnInsert: {
        institutionId,
        mentorshipId: mentorship1._id,
        startAt: sessionStart,
        endAt: sessionEnd,
        timezone: 'Asia/Kolkata',
        status: SessionStatus.SCHEDULED,
        calendarProvider: CalendarProvider.GOOGLE,
        meetingUrl: 'https://meet.google.com/xyz-p11-demo',
        notes: 'Discussion on consensus protocols and distributed database capstone design.',
      },
    },
    { upsert: true }
  );

  // Completed Past Session
  const pastStart = new Date('2025-02-10T14:00:00Z');
  const pastEnd = new Date('2025-02-10T15:00:00Z');

  await Session.findOneAndUpdate(
    { institutionId, mentorshipId: mentorship1._id, startAt: pastStart },
    {
      $setOnInsert: {
        institutionId,
        mentorshipId: mentorship1._id,
        startAt: pastStart,
        endAt: pastEnd,
        timezone: 'Asia/Kolkata',
        status: SessionStatus.COMPLETED,
        calendarProvider: CalendarProvider.GOOGLE,
        notes: 'Initial introduction and review of Aarav’s systems resume and GitHub projects.',
      },
    },
    { upsert: true, new: true }
  );

  // Goal & Action Items
  const goal1 = await Goal.findOneAndUpdate(
    { institutionId, mentorshipId: mentorship1._id, title: 'Systems Design Capstone Architecture' },
    {
      $setOnInsert: {
        institutionId,
        mentorshipId: mentorship1._id,
        title: 'Systems Design Capstone Architecture',
        status: GoalStatus.IN_PROGRESS,
      },
    },
    { upsert: true, new: true }
  );

  await ActionItem.findOneAndUpdate(
    { institutionId, goalId: goal1._id, title: 'Draft sequence diagram for multi-raft replication' },
    {
      $setOnInsert: {
        institutionId,
        goalId: goal1._id,
        title: 'Draft sequence diagram for multi-raft replication',
        status: ActionItemStatus.PENDING,
        dueDate: new Date(Date.now() + 7 * 86400000),
      },
    },
    { upsert: true }
  );

  // Feedback for past session
  await Feedback.findOneAndUpdate(
    { institutionId, mentorshipId: mentorship1._id, submittedBy: aaravStudent.user._id },
    {
      $setOnInsert: {
        institutionId,
        mentorshipId: mentorship1._id,
        submittedBy: aaravStudent.user._id,
        submittedByRole: UserRole.STUDENT,
        rating: 5,
        comments: 'Amanpreet Sir gave concrete advice on how to structure raft log compaction and what Google interviews look for in Distributed Systems. Highly motivating!',
        submittedAt: new Date('2025-02-11T10:00:00Z'),
      },
    },
    { upsert: true }
  );

  // Engagement Snapshot
  await EngagementSnapshot.findOneAndUpdate(
    { institutionId, mentorshipId: mentorship1._id },
    {
      $set: {
        institutionId,
        mentorshipId: mentorship1._id,
        status: EngagementStatus.HEALTHY,
        assessedAt: new Date(),
        metrics: {
          daysSinceLastInteraction: 4,
          sessionsCompleted: 1,
          goalsCompleted: 0,
        },
      },
    },
    { upsert: true }
  );

  // 7. Programme Configuration
  await ProgrammeConfiguration.findOneAndUpdate(
    { institutionId, version: 1 },
    {
      $setOnInsert: {
        institutionId,
        version: 1,
        matchingWeights: {
          skillsOverlap: 0.4,
          industryRelevance: 0.3,
          careerGoalAlignment: 0.2,
          availabilityWindowOverlap: 0.1,
        },
        requestPolicy: {
          maxConcurrentRequestsPerStudent: 3,
          requestExpiryDays: 14,
        },
        engagementSettings: {
          inactivityWarningDays: 21,
          staleMentorshipDays: 45,
        },
        effectiveFrom: new Date('2024-01-01'),
        updatedBy: staffUsers[0].institutionId,
      },
    },
    { upsert: true }
  );
  console.log('✅ Programme Configuration (v1) verified');

  // Final count audit
  const [alumniCount, studentCount, capacityCount, mediaCount, reqCount, mentorCount] =
    await Promise.all([
      Alumnus.countDocuments({ institutionId }),
      StudentProfile.countDocuments({ institutionId }),
      MentorCapacity.countDocuments({ institutionId }),
      UserMediaAsset.countDocuments({ institutionId }),
      MentorshipRequest.countDocuments({ institutionId }),
      Mentorship.countDocuments({ institutionId }),
    ]);

  console.log('\n=============================================');
  console.log('🎉 P11 DATABASE SEED COMPLETED SUCCESSFULLY');
  console.log('=============================================');
  console.log(`🏫 Institution:           1 (${SEED_INSTITUTION.name})`);
  console.log(`👥 Alumni Profiles:       ${alumniCount} (Requirement: >= 50)`);
  console.log(`🎓 Student Profiles:      ${studentCount}`);
  console.log(`⚡ Mentor Capacities:     ${capacityCount}`);
  console.log(`🖼️ User Media Assets:     ${mediaCount}`);
  console.log(`🤝 Mentorship Requests:   ${reqCount}`);
  console.log(`⭐ Active Mentorships:    ${mentorCount}`);
  console.log('=============================================\n');
}

// Allow direct execution: npx tsx src/lib/db/seed/index.ts
if (require.main === module || process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Database seed error:', err);
      await disconnectDB();
      process.exit(1);
    });
}
