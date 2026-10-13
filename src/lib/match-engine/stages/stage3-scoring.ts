/**
 * Stage 3: Multi-Factor Domain Scoring
 *
 * Implements composite domain scoring:
 * - Relatable Seniority Gap (Gaussian bell curve around 2.5-4.5 years experience)
 * - Bayesian-Smoothed Mentee Rating (shrinking toward institutional mean)
 * - Mentor Responsiveness & Session Completion reliability
 * - Availability Window Recency
 * - Configurable weights from ProgrammeConfiguration (SRS FR-M4-09)
 */

import type { MatchWeights, ScoreBreakdown, StudentMatchContext } from '../types';
import { DEFAULT_MATCH_WEIGHTS } from '../types';
import type { RetrievalResult } from './stage2-retrieval';

export interface ScoredCandidate {
  retrieval: RetrievalResult;
  totalScore: number;
  breakdown: ScoreBreakdown;
}

/**
 * Score retrieved candidates using multi-factor domain weighting.
 */
export function scoreCandidates(
  student: StudentMatchContext,
  retrievalResults: RetrievalResult[],
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): ScoredCandidate[] {
  // Normalize weights so sum = 1.0
  const weightSum =
    weights.semanticVector +
    weights.taxonomyOverlap +
    weights.seniorityGap +
    weights.bayesianRating +
    weights.responsiveness +
    weights.availabilityRecency;

  const w = {
    semantic: weights.semanticVector / weightSum,
    taxonomy: weights.taxonomyOverlap / weightSum,
    seniority: weights.seniorityGap / weightSum,
    rating: weights.bayesianRating / weightSum,
    resp: weights.responsiveness / weightSum,
    avail: weights.availabilityRecency / weightSum,
  };

  const scored: ScoredCandidate[] = [];

  for (const item of retrievalResults) {
    const candidate = item.candidate;
    const alumnus = candidate.alumnus;

    // 1. Semantic & Taxonomy scores from Stage 2
    const semanticScore = item.semanticSimilarity;
    const taxonomyScore = item.taxonomyOverlap;

    // 2. Relatable Seniority Sweet Spot Score
    // Experience difference: alumnus years in industry relative to student's graduation
    const studentGradYear = student.profile.graduationYear ?? new Date().getFullYear() + 1;
    const alumnusGradYear = alumnus.graduationYear ?? studentGradYear - 3;
    const deltaYears = studentGradYear - alumnusGradYear;

    // Optimal gap: 3.5 years ahead (sigma = 2.0)
    const optimalGap = 3.5;
    const sigma = 2.0;
    const seniorityScore = Math.max(
      0.15,
      Math.exp(-Math.pow(deltaYears - optimalGap, 2) / (2 * Math.pow(sigma, 2)))
    );

    // 3. Bayesian Smoothed Rating Score
    // Formula: (C * m + N * r_avg) / (C + N) / 5.0
    // Institutional prior mean m = 4.5, prior weight C = 3
    const priorMean = 4.5;
    const priorConfidence = 3;
    const reviewCount = candidate.rating.count;
    const rawRating = candidate.rating.average;

    const smoothedRating =
      reviewCount > 0
        ? (priorConfidence * priorMean + reviewCount * rawRating) / (priorConfidence + reviewCount)
        : priorMean; // Fair default for unreviewed new mentors
    const ratingScore = Math.min(1.0, Math.max(0.0, smoothedRating / 5.0));

    // 4. Responsiveness & Session Completion Score
    let responsivenessScore = 0.85; // neutral baseline
    if (candidate.metrics.completedSessionCount >= 3) {
      responsivenessScore = 0.95;
    } else if (candidate.metrics.completedSessionCount >= 1) {
      responsivenessScore = 0.90;
    }
    // Slight penalty if mentor is sitting on pending unread requests
    if (candidate.metrics.pendingRequestCount > 0) {
      responsivenessScore -= candidate.metrics.pendingRequestCount * 0.05;
    }
    responsivenessScore = Math.max(0.4, Math.min(1.0, responsivenessScore));

    // 5. Imminent Availability Window Recency Score
    const now = new Date();
    const upcomingDaysLimit = 30 * 24 * 60 * 60 * 1000;
    const imminentDaysLimit = 7 * 24 * 60 * 60 * 1000;

    let availabilityScore = 0.5; // baseline
    const windows = candidate.availabilityWindows ?? [];
    for (const win of windows) {
      const startMs = new Date(win.startAt).getTime();
      const diff = startMs - now.getTime();
      if (diff > 0 && diff <= imminentDaysLimit) {
        availabilityScore = 1.0; // Sessions available this week
        break;
      } else if (diff > 0 && diff <= upcomingDaysLimit) {
        availabilityScore = 0.8; // Sessions available this month
      }
    }

    // 6. Composite Weighted Sum
    const totalScore =
      w.semantic * semanticScore +
      w.taxonomy * taxonomyScore +
      w.seniority * seniorityScore +
      w.rating * ratingScore +
      w.resp * responsivenessScore +
      w.avail * availabilityScore;

    const breakdown: ScoreBreakdown = {
      semanticScore: Number(semanticScore.toFixed(3)),
      taxonomyScore: Number(taxonomyScore.toFixed(3)),
      seniorityScore: Number(seniorityScore.toFixed(3)),
      ratingScore: Number(ratingScore.toFixed(3)),
      responsivenessScore: Number(responsivenessScore.toFixed(3)),
      availabilityScore: Number(availabilityScore.toFixed(3)),
    };

    scored.push({
      retrieval: item,
      totalScore: Number(totalScore.toFixed(4)),
      breakdown,
    });
  }

  // Sort descending by total score
  return scored.sort((a, b) => b.totalScore - a.totalScore);
}
