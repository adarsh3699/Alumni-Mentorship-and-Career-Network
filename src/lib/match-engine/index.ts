/**
 * P11 Matching Engine (M4) — Public API Entry Point
 *
 * Provides a robust 4-stage funnel matchmaker for student-alumni mentorship:
 * - Stage 1: Hard Constraints & Anti-Herd Filtering (Capacity, Safety, Deduplication)
 * - Stage 2: Hybrid Retrieval (Dense Semantic Vector + Sparse Taxonomy Overlap)
 * - Stage 3: Multi-Factor Domain Scoring (Seniority Gaussian, Bayesian Ratings, Responsiveness)
 * - Stage 4: Non-Hallucinated Explainability & Diversity Reranking
 */

export { MatchEngine, matchEngine } from './engine';
export * from './types';
export * from './embedding';
export * from './stages';
