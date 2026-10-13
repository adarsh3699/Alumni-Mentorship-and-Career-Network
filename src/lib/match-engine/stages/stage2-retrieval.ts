/**
 * Stage 2: Hybrid Retrieval (Dense Vector + Sparse Taxonomy)
 *
 * Combines semantic vector similarity with exact expertise taxonomy overlap.
 */

import type { IEmbeddingProvider } from '../embedding';
import {
  cosineSimilarity,
  jaccardSimilarity,
  coverageRatio,
  synthesizeStudentDocument,
  synthesizeAlumnusDocument,
} from '../embedding';
import type { MentorCandidate, StudentMatchContext } from '../types';

export interface RetrievalResult {
  candidate: MentorCandidate;
  semanticSimilarity: number;
  taxonomyOverlap: number;
  retrievalScore: number;
}

export async function runHybridRetrieval(
  student: StudentMatchContext,
  candidates: MentorCandidate[],
  embedder: IEmbeddingProvider,
  topK: number = 50
): Promise<RetrievalResult[]> {
  // 1. Synthesize student pseudo-document & embed if not already provided
  const studentDoc = student.syntheticDocument ?? synthesizeStudentDocument(student.profile, student.careerGoals);
  const studentVector = student.vectorEmbedding ?? (await embedder.embedText(studentDoc));

  const results: RetrievalResult[] = [];

  for (const candidate of candidates) {
    // 2. Synthesize alumnus document & embed if needed
    const alumnusDoc = candidate.syntheticDocument ?? synthesizeAlumnusDocument(candidate.alumnus);
    const alumniVector = candidate.vectorEmbedding ?? (await embedder.embedText(alumnusDoc));

    // 3. Dense semantic vector score (cosine similarity)
    const semanticSimilarity = cosineSimilarity(studentVector, alumniVector);

    // 4. Sparse exact taxonomy overlap
    const studentInterests = student.profile.interests ?? [];
    const mentorExpertise = candidate.alumnus.expertise ?? candidate.alumnus.mentoringInterests ?? [];
    const jaccard = jaccardSimilarity(studentInterests, mentorExpertise);
    const coverage = coverageRatio(studentInterests, mentorExpertise);
    const taxonomyOverlap = (jaccard * 0.5) + (coverage * 0.5);

    // 5. Hybrid retrieval fusion (65% dense semantic, 35% exact keyword taxonomy)
    const retrievalScore = (semanticSimilarity * 0.65) + (taxonomyOverlap * 0.35);

    results.push({
      candidate: {
        ...candidate,
        syntheticDocument: alumnusDoc,
        vectorEmbedding: alumniVector,
      },
      semanticSimilarity,
      taxonomyOverlap,
      retrievalScore,
    });
  }

  // Sort descending by retrieval score and take top K candidates
  return results.sort((a, b) => b.retrievalScore - a.retrievalScore).slice(0, topK);
}
