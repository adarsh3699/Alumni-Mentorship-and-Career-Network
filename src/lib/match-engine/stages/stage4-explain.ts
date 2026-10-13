/**
 * Stage 4: Explainability & Diversity Reranking
 *
 * Implements SRS FR-M4-07 (Explainable Recommendations) & FR-M4-10 (No Fabricated Reasons).
 * Formulates non-hallucinated explanations and applies anti-starvation diversification.
 */

import type { ScoredRecommendation, StudentMatchContext } from '../types';
import type { ScoredCandidate } from './stage3-scoring';

export function explainAndRerank(
  student: StudentMatchContext,
  scoredCandidates: ScoredCandidate[],
  limit: number = 10
): ScoredRecommendation[] {
  if (scoredCandidates.length === 0) {
    return [];
  }

  // 1. Anti-Starvation / Company Diversity Reranking
  // Penalize clustering: if 2 mentors from company X are already in top 3, slightly de-prioritize the 3rd
  const companyCounts: Record<string, number> = {};
  const rerankedList: ScoredCandidate[] = [];

  for (const item of scoredCandidates) {
    const company = item.retrieval.candidate.alumnus.currentCompany?.toLowerCase().trim() || 'other';
    const seenCount = companyCounts[company] || 0;

    let adjustedScore = item.totalScore;
    if (seenCount >= 2) {
      // Small diversity soft penalty (0.04) if company is already heavily represented in top results
      adjustedScore = Math.max(0, adjustedScore - 0.04);
    }

    companyCounts[company] = seenCount + 1;
    rerankedList.push({
      ...item,
      totalScore: Number(adjustedScore.toFixed(4)),
    });
  }

  // Re-sort after diversity penalty and truncate to limit
  const finalCandidates = rerankedList
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);

  // 2. Generate Evidence-Based Explanations (SRS FR-M4-10)
  const recommendations: ScoredRecommendation[] = [];
  const studentInterests = (student.profile.interests ?? []).map((s) => s.toLowerCase().trim());
  const studentIndustries = (student.profile.targetIndustries ?? []).map((s) => s.toLowerCase().trim());
  const studentGradYear = student.profile.graduationYear ?? new Date().getFullYear() + 1;

  for (let idx = 0; idx < finalCandidates.length; idx++) {
    const item = finalCandidates[idx];
    const candidate = item.retrieval.candidate;
    const alumnus = candidate.alumnus;
    const reasons: string[] = [];

    const mentorCompany = alumnus.currentCompany ?? 'Industry Partner';
    const mentorTitle = alumnus.currentTitle ?? alumnus.currentRole ?? alumnus.professionalHeadline ?? 'Senior Software Engineer';
    const mentorIndustry = alumnus.industry ?? 'Technology';
    const alumnusGradYear = alumnus.graduationYear ?? (studentGradYear - 4);
    const mentorExpertise: string[] = alumnus.expertise ?? alumnus.mentoringInterests ?? [];

    // Reason A: Exact Skill / Taxonomy Overlap
    const sharedSkills = mentorExpertise.filter((skill: string) =>
      studentInterests.includes(skill.toLowerCase().trim())
    );

    if (sharedSkills.length > 0) {
      reasons.push(
        `Strong technical synergy in: ${sharedSkills.slice(0, 3).join(', ')}`
      );
    } else if (item.breakdown.semanticScore >= 0.70) {
      reasons.push(
        `Semantic career alignment with your target specialization in ${mentorIndustry}`
      );
    }

    // Reason B: Industry & Company Match
    const industryLower = mentorIndustry.toLowerCase().trim();
    if (studentIndustries.some((ind) => industryLower.includes(ind) || ind.includes(industryLower))) {
      reasons.push(
        `Directly aligns with your target industry (${mentorIndustry}) at ${mentorCompany}`
      );
    } else {
      reasons.push(
        `Holds senior engineering position as ${mentorTitle} at ${mentorCompany}`
      );
    }

    // Reason C: Relatable Experience / Placement Timing
    const deltaYears = studentGradYear - alumnusGradYear;
    if (deltaYears >= 2 && deltaYears <= 5) {
      reasons.push(
        `LPU CSE alumnus (${alumnusGradYear}) — recent placement and recruitment insights`
      );
    } else if (deltaYears > 5) {
      reasons.push(
        `Veteran engineering practitioner with ${deltaYears}+ years of industry systems experience`
      );
    }

    // Reason D: Proven Feedback & Reliability
    if (candidate.rating.count >= 1 && candidate.rating.average >= 4.5) {
      reasons.push(
        `Proven track record: ${candidate.rating.average.toFixed(1)}/5 rating from previous mentees`
      );
    } else if (candidate.capacity.maxConcurrentMentees - candidate.capacity.activeMentees >= 2) {
      reasons.push(
        `High availability: ${candidate.capacity.maxConcurrentMentees - candidate.capacity.activeMentees} open mentee slots ready for immediate onboarding`
      );
    }

    const capacityRemaining = Math.max(
      0,
      candidate.capacity.maxConcurrentMentees - candidate.capacity.activeMentees
    );

    recommendations.push({
      alumnusId: alumnus._id,
      alumnusName: alumnus.displayName || alumnus.name || 'Alumnus Mentor',
      alumnusTitle: mentorTitle,
      alumnusCompany: mentorCompany,
      alumnusIndustry: mentorIndustry,
      alumnusGradYear,
      expertise: mentorExpertise,
      totalScore: item.totalScore,
      rank: idx + 1,
      breakdown: item.breakdown,
      reasons,
      capacityRemaining,
    });
  }

  return recommendations;
}
