/**
 * P11 Real-World Matchmaker Engine (M4)
 *
 * Implements the 4-Stage Multi-Criteria Matching Funnel:
 * Stage 1: Hard Constraints & Anti-Herd Filtering (Capacity, Verification, Safety)
 * Stage 2: Hybrid Retrieval (Dense Semantic Vector + Sparse Taxonomy Jaccard)
 * Stage 3: Multi-Factor Domain Scoring (Seniority Sweet Spot, Bayesian Ratings, Responsiveness)
 * Stage 4: Explainability & Anti-Starvation Diversity Reranking
 *
 * Persists derived match snapshots to MongoDB via MatchScoreRepository (SRS §8).
 */

import type { Types } from 'mongoose';
import {
  Alumnus,
  MentorCapacity,
  AvailabilityWindow,
  MentorshipRequest,
  Feedback,
} from '../db/models';
import {
  StudentProfileRepository,
  CareerGoalRepository,
  MentorshipRepository,
  MentorshipRequestRepository,
  ProgrammeConfigurationRepository,
  MatchScoreRepository,
} from '../db/repositories';
import {
  VerificationStatus,
  MentorshipStatus,
  MentorshipRequestStatus,
} from '../db/types/enums';
import type { IEmbeddingProvider } from './embedding';
import { defaultEmbeddingProvider } from './embedding';
import type {
  MatchEngineOptions,
  MatchWeights,
  MentorCandidate,
  ScoredRecommendation,
  StudentMatchContext,
} from './types';
import { DEFAULT_MATCH_WEIGHTS } from './types';
import {
  filterCandidateMentors,
  runHybridRetrieval,
  scoreCandidates,
  explainAndRerank,
} from './stages';

export class MatchEngine {
  constructor(
    private readonly embedder: IEmbeddingProvider = defaultEmbeddingProvider
  ) {}

  /**
   * Find ranked, explainable mentor recommendations for a student.
   * Runs the complete 4-stage funnel and optionally caches the derived snapshot.
   */
  async getRecommendationsForStudent(
    institutionId: Types.ObjectId,
    studentUserId: Types.ObjectId,
    options: MatchEngineOptions = {}
  ): Promise<ScoredRecommendation[]> {
    const limit = options.limit ?? 10;
    const persistScores = options.persistScores ?? true;

    // ── 1. Fetch Student Context ─────────────────────────────────────────
    const studentProfile = await StudentProfileRepository.findByUserId(
      institutionId,
      studentUserId
    );
    if (!studentProfile) {
      return [];
    }

    const careerGoals = await CareerGoalRepository.findByStudentProfile(
      institutionId,
      studentProfile._id
    );

    const studentContext: StudentMatchContext = {
      studentUserId,
      profile: studentProfile,
      careerGoals,
    };

    // ── 2. Determine Scoring Weights ─────────────────────────────────────
    // Fetch administrator policy weights or fallback to defaults
    const activeConfig = await ProgrammeConfigurationRepository.findCurrentEffective(
      institutionId
    );
    const weights: MatchWeights = {
      ...DEFAULT_MATCH_WEIGHTS,
      ...(activeConfig?.matchingWeights as Partial<MatchWeights> | undefined),
      ...options.weights,
    };

    // ── 3. Fetch Existing Student Relationships to Prevent Duplicates ────
    const [activeMentorships, pendingRequests] = await Promise.all([
      MentorshipRepository.findMany(institutionId, {
        studentUserId,
        status: MentorshipStatus.ACTIVE,
      }),
      MentorshipRequestRepository.findMany(institutionId, {
        studentUserId,
        status: MentorshipRequestStatus.PENDING,
      }),
    ]);

    const existingActiveMentorIds = new Set<string>(
      activeMentorships.map((m) => m.mentorAlumnusId.toString())
    );
    const existingPendingMentorIds = new Set<string>(
      pendingRequests.map((r) => r.mentorAlumnusId.toString())
    );

    // ── 4. Load Raw Alumni Candidates & Supporting Metadata ──────────────
    const alumniList = await Alumnus.find({
      institutionId,
      verificationStatus: VerificationStatus.VERIFIED,
    })
      .lean()
      .exec();

    if (alumniList.length === 0) {
      return [];
    }

    const alumniIds = alumniList.map((a) => a._id);

    // Concurrently load capacities, pending counts, availability, and ratings
    const [capacities, pendingCounts, availabilityList, feedbackAggregations] =
      await Promise.all([
        MentorCapacity.find({ institutionId, alumnusId: { $in: alumniIds } })
          .lean()
          .exec(),

        MentorshipRequest.aggregate<{ _id: Types.ObjectId; count: number }>([
          {
            $match: {
              institutionId,
              mentorAlumnusId: { $in: alumniIds },
              status: MentorshipRequestStatus.PENDING,
            },
          },
          {
            $group: {
              _id: '$mentorAlumnusId',
              count: { $sum: 1 },
            },
          },
        ]),

        AvailabilityWindow.find({
          institutionId,
          alumnusId: { $in: alumniIds },
          endAt: { $gte: new Date() },
        })
          .lean()
          .exec(),

        Feedback.aggregate<{ _id: Types.ObjectId; avgRating: number; count: number }>([
          {
            $match: {
              institutionId,
            },
          },
          {
            $lookup: {
              from: 'mentorships',
              localField: 'mentorshipId',
              foreignField: '_id',
              as: 'mentorship',
            },
          },
          {
            $unwind: '$mentorship',
          },
          {
            $group: {
              _id: '$mentorship.mentorAlumnusId',
              avgRating: { $avg: '$rating' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    // Map helpers for O(1) lookups
    const capacityMap = new Map(capacities.map((c) => [c.alumnusId.toString(), c]));
    const pendingCountMap = new Map(pendingCounts.map((p) => [p._id.toString(), p.count]));
    const ratingMap = new Map(
      feedbackAggregations.map((f) => [f._id.toString(), { average: f.avgRating, count: f.count }])
    );
    const availabilityMap = new Map<string, typeof availabilityList>();
    for (const win of availabilityList) {
      const key = win.alumnusId.toString();
      const existing = availabilityMap.get(key) ?? [];
      existing.push(win);
      availabilityMap.set(key, existing);
    }

    // ── 5. STAGE 1: Hard Candidate Filtering ─────────────────────────────
    const stage1Inputs = alumniList.map((alumnus) => ({
      alumnus,
      capacity: capacityMap.get(alumnus._id.toString()) ?? null,
      pendingRequestCount: pendingCountMap.get(alumnus._id.toString()) ?? 0,
    }));

    const stage1Passed = filterCandidateMentors(stage1Inputs, {
      institutionId,
      studentUserId,
      existingActiveMentorIds,
      existingPendingMentorIds,
      maxPendingRequestsPerMentor: 4,
    });

    if (stage1Passed.length === 0) {
      return [];
    }

    // Transform into MentorCandidate objects
    const candidatePool: MentorCandidate[] = stage1Passed.map((item) => {
      const alumnusIdStr = item.alumnus._id.toString();
      const windows = availabilityMap.get(alumnusIdStr) ?? [];

      // Rating lookup from feedback aggregations (or default for newly joined mentors)
      const rating = ratingMap.get(alumnusIdStr) ?? { average: 4.8, count: 1 };

      return {
        alumnus: item.alumnus,
        capacity: item.capacity,
        availabilityWindows: windows,
        rating,
        metrics: {
          pendingRequestCount: item.pendingRequestCount,
          completedSessionCount: 2,
        },
      };
    });

    // ── 6. STAGE 2: Hybrid Retrieval (Dense Vector + Sparse Taxonomy) ────
    const stage2Results = await runHybridRetrieval(
      studentContext,
      candidatePool,
      this.embedder,
      50 // Top 50 candidates passed to scoring
    );

    // ── 7. STAGE 3: Multi-Factor Domain Scoring ──────────────────────────
    const stage3Scored = scoreCandidates(studentContext, stage2Results, weights);

    // ── 8. STAGE 4: Explainability & Diversity Reranking ─────────────────
    const recommendations = explainAndRerank(studentContext, stage3Scored, limit);

    // ── 9. Persist Derived Match Scores (SRS FR-M4-06) ───────────────────
    if (persistScores && recommendations.length > 0) {
      await MatchScoreRepository.replaceScoresForStudent(
        institutionId,
        studentProfile._id,
        recommendations.map((rec) => ({
          alumnusId: rec.alumnusId,
          score: rec.totalScore,
          rank: rec.rank,
          reasons: rec.reasons,
          generatedAt: new Date(),
          matchingVersion: activeConfig?.version ? `v${activeConfig.version}` : 'v1.0',
        }))
      );
    }

    return recommendations;
  }
}

/** Singleton instance with default local semantic vectorizer */
export const matchEngine = new MatchEngine();
