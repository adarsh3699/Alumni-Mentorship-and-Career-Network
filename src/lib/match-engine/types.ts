/**
 * P11 Matching Engine (M4) — Type Definitions
 *
 * Implements SRS FR-M4-01 through FR-M4-10:
 * Multi-criteria matching, configurable weights, capacity constraints,
 * and auditable explainability reasons.
 */

import type { Types } from 'mongoose';
import type {
  IAlumnus,
  IMentorCapacity,
  IAvailabilityWindow,
  IStudentProfile,
  ICareerGoal,
} from '../db/types';

/**
 * Configurable weights for composite scoring (SRS FR-M4-09).
 * Normalizes to sum = 1.0.
 */
export interface MatchWeights {
  /** Dense vector cosine semantic similarity */
  semanticVector: number;
  /** Exact taxonomy tag overlap (Jaccard similarity) */
  taxonomyOverlap: number;
  /** Relatable seniority sweet spot (2-5 years experience gap) */
  seniorityGap: number;
  /** Bayesian-smoothed mentee rating */
  bayesianRating: number;
  /** Response velocity & session completion reliability */
  responsiveness: number;
  /** Imminent availability window boost */
  availabilityRecency: number;
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  semanticVector: 0.35,
  taxonomyOverlap: 0.20,
  seniorityGap: 0.15,
  bayesianRating: 0.15,
  responsiveness: 0.10,
  availabilityRecency: 0.05,
};

/**
 * Filtered candidate mentor bundle for Stage 2 & 3 scoring.
 */
export interface MentorCandidate {
  alumnus: IAlumnus;
  capacity: IMentorCapacity;
  availabilityWindows: IAvailabilityWindow[];
  rating: {
    average: number;
    count: number;
  };
  metrics: {
    pendingRequestCount: number;
    completedSessionCount: number;
  };
  syntheticDocument?: string;
  vectorEmbedding?: number[];
}

/**
 * Context of student seeking mentorship recommendations.
 */
export interface StudentMatchContext {
  studentUserId: Types.ObjectId;
  profile: IStudentProfile;
  careerGoals: ICareerGoal[];
  syntheticDocument?: string;
  vectorEmbedding?: number[];
}

/**
 * Individual scoring component breakdown for transparency & testing.
 */
export interface ScoreBreakdown {
  semanticScore: number;
  taxonomyScore: number;
  seniorityScore: number;
  ratingScore: number;
  responsivenessScore: number;
  availabilityScore: number;
}

/**
 * Final scored and ranked recommendation for a student.
 */
export interface ScoredRecommendation {
  alumnusId: Types.ObjectId;
  alumnusName: string;
  alumnusTitle: string;
  alumnusCompany: string;
  alumnusIndustry: string;
  alumnusGradYear: number;
  expertise: string[];
  totalScore: number;
  rank: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  capacityRemaining: number;
}

/**
 * Options for configuring match execution.
 */
export interface MatchEngineOptions {
  limit?: number;
  weights?: Partial<MatchWeights>;
  minScoreThreshold?: number;
  persistScores?: boolean;
}
