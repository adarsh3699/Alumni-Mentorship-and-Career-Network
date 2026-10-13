# P11 Matchmaker Engine (M4)

Robust, Real-World 4-Stage Funnel Matching Engine for Student-Alumni Mentorship Networks.

Designed in accordance with **SRS Module 4 (FR-M4-01 through FR-M4-10)**, the **High-Level Design (HLD §4.4)**, and **Database Design (§9.1)**.

---

## 1. Architectural Overview: The 4-Stage Matching Funnel

Traditional recommendation engines either suffer from cold start problems, herd effects (all students flocking to the same senior Google director), or opaque black-box recommendations.

The P11 Matchmaker Engine uses a **4-stage progressive filtering & scoring funnel**:

```
                       ┌──────────────────────────────┐
                       │  Alumni Candidates in Tenant │ (e.g. 50+ alumni)
                       └──────────────┬───────────────┘
                                      │
                                      ▼
    Stage 1: Hard Constraints & Anti-Herd Filtering
    • Multi-tenant isolation (institutionId)
    • Verified status only (FR-M4-01)
    • Active capacity remaining & accepting mentees (FR-M4-04)
    • Prevent duplicate active mentorships / pending requests
    • Anti-Herd throttle (caps mentors with ≥ 4 pending requests)
                                      │
                                      ▼  (Eligible candidate pool)
    Stage 2: Hybrid Retrieval (Dense Vector + Sparse Taxonomy)
    • Asymmetric profile synthesis (Student Aspirations ↔ Alumni Career)
    • 128-dimensional dense semantic vector cosine similarity
    • Sparse exact taxonomy tag overlap (Jaccard + Coverage)
    • Hybrid score: 0.65 * DenseVector + 0.35 * SparseTaxonomy
                                      │
                                      ▼  (Top 50 retrieved candidates)
    Stage 3: Multi-Factor Domain Composite Scoring
    • Gaussian Seniority Sweet Spot (relatable peer mentors 2.5-4.5 yrs ahead)
    • Bayesian-Smoothed Mentee Ratings (shrinkage to institutional mean)
    • Responsiveness velocity & session completion reliability
    • Imminent availability window boost (within 7–30 days)
    • Administrator-configurable weights (FR-M4-09)
                                      │
                                      ▼  (Top candidates ranked)
    Stage 4: Explainability & Diversity Reranking
    • Anti-starvation company diversification (prevents single-employer monopoly)
    • Evidence-based, non-hallucinated explanations (FR-M4-07 & FR-M4-10)
    • Snapshot persistence to MongoDB via MatchScoreRepository (FR-M4-06)
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │ Ranked Recommendations +     │
                       │ Auditable Reasons + Breakdown│
                       └──────────────────────────────┘
```

---

## 2. Directory Structure

```text
src/lib/match-engine/
├── embedding/
│   ├── index.ts                 # Embedding barrel export
│   ├── provider.interface.ts    # IEmbeddingProvider contract (dimensions, embedText, embedBatch)
│   ├── tfidf-vectorizer.ts      # LocalSemanticVectorizer (128d unit vector, 0 API key required)
│   ├── synthesis.ts             # Profile pseudo-document synthesizers (solves asymmetric gap)
│   └── similarity.ts            # Cosine similarity, Jaccard similarity, coverage ratio
├── stages/
│   ├── index.ts                 # Stages barrel export
│   ├── stage1-filter.ts         # Stage 1: Hard business rules, capacity & anti-herd filtering
│   ├── stage2-retrieval.ts      # Stage 2: Hybrid retrieval (dense vector + sparse taxonomy)
│   ├── stage3-scoring.ts        # Stage 3: Multi-factor domain scoring & Bayesian shrinkage
│   └── stage4-explain.ts        # Stage 4: Non-hallucinated explanations & company diversification
├── engine.ts                    # MatchEngine orchestrator & MongoDB snapshot persistence
├── types.ts                     # Types, MatchWeights, ScoredRecommendation, Candidate interfaces
├── index.ts                     # Public API entry point
└── README.md                    # Engine documentation
```

---

## 3. Mathematical Formulations

### 3.1 Profile Asymmetry & Semantic Synthesis (Stage 2)
Students and alumni describe their technical backgrounds with asymmetric vocabularies. The engine bridges this gap by synthesizing structured pseudo-documents:

- **Student Pseudo-Document**:
  ```text
  [STUDENT PROFILE]
  Major: Computer Science and Engineering
  Degree: B.Tech
  Expected Graduation: 2026
  Target Roles: Software Engineer, Distributed Systems Engineer
  Target Industries: Technology, Cloud Computing
  Technical Interests & Skills: System Design & Architecture, Distributed Systems, Go
  Career Goals: Clear Big Tech System Design interviews and build high-throughput microservices
  ```

- **Alumnus Pseudo-Document**:
  ```text
  [ALUMNUS PROFILE]
  Current Role: Staff Software Engineer
  Current Company: Google
  Industry: Technology
  Core Expertise & Technologies: Distributed Systems, System Design & Architecture, Low Latency
  Education: B.Tech in CSE, Class of 2015
  Professional Background: 9+ years building planet-scale distributed storage engines...
  ```

### 3.2 Relatable Seniority Sweet Spot (Stage 3)
In real-world mentorship, a 2nd or 3rd-year student often benefits more from an alumnus 2–4 years ahead (who recently passed the same hiring bars) than a VP of Engineering 20 years removed from entry-level interviews.

We model this using a Gaussian bell curve:
$$\text{Score}_{\text{seniority}} = \max\left(0.15, \exp\left(-\frac{(\Delta_{\text{years}} - \mu)^2}{2\sigma^2}\right)\right)$$
Where:
- $\Delta_{\text{years}} = \text{GradYear}_{\text{student}} - \text{GradYear}_{\text{alumnus}}$
- $\mu = 3.5$ years (sweet spot)
- $\sigma = 2.0$ years

### 3.3 Bayesian-Smoothed Mentee Ratings (Stage 3)
A mentor with 1 review of 5.0 stars should not outrank a seasoned mentor with 45 reviews averaging 4.9 stars. We apply Bayesian shrinkage toward the institutional prior:
$$\bar{R} = \frac{C \cdot m + N \cdot r_{\text{avg}}}{C + N}$$
Where:
- $m = 4.5$ (institutional prior mean)
- $C = 3$ (prior confidence weight)
- $N = \text{number of completed mentee reviews}$
- $r_{\text{avg}} = \text{sample mean review score}$

### 3.4 Anti-Starvation & Diversity Reranking (Stage 4)
If top scoring candidates are clustered at the same company (e.g., 3 consecutive Google engineers), the engine applies a progressive diversity dampener to promote candidates across diverse employers (Amazon, Microsoft, Zomato, Goldman Sachs).

### 3.5 Evidence-Based Explainability (SRS FR-M4-07 & FR-M4-10)
Explanations are strictly synthesized from factual overlap:
- **Skill Overlap**: Lists specific intersecting taxonomy tags (e.g., `"Strong technical synergy in: System Design, Distributed Systems"`).
- **Target Industry**: Validates student target industry against alumnus employer.
- **Placement Insights**: Cites graduation cohort proximity for recent graduates or veteran depth for senior practitioners.
- **Availability Guarantee**: Highlights concrete open mentee capacity slots.

---

## 4. Default Scoring Weights (Configurable)

| Factor | Default Weight | Description |
|---|---:|---|
| `semanticVector` | **35%** | Dense cosine similarity between synthesized documents |
| `taxonomyOverlap` | **20%** | Exact Jaccard overlap of institutional expertise tags |
| `seniorityGap` | **15%** | Gaussian bell curve around 2.5–4.5 years experience gap |
| `bayesianRating` | **15%** | Smoothed mentee satisfaction from completed mentorships |
| `responsiveness` | **10%** | Request response rate and session completion reliability |
| `availabilityRecency` | **5%** | Active availability windows open within 7–30 days |

Institution administrators can override these weights at any time via `ProgrammeConfiguration` (SRS FR-M4-09).

---

## 5. Usage Guide

### Basic Recommendation Query
```typescript
import { matchEngine } from '@/lib/match-engine';

// Inside an API route or server action
const recommendations = await matchEngine.getRecommendationsForStudent(
  institutionId,
  studentUserId,
  {
    limit: 10,
    persistScores: true, // Automatically writes snapshots to MatchScore collection
  }
);

for (const rec of recommendations) {
  console.log(`#${rec.rank}: ${rec.alumnusName} (${rec.alumnusCompany}) - Score: ${(rec.totalScore * 100).toFixed(1)}%`);
  console.log('Reasons:', rec.reasons);
}
```

### Custom Embedder (e.g., OpenAI or Ollama)
```typescript
import { MatchEngine, IEmbeddingProvider } from '@/lib/match-engine';

class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  name = 'text-embedding-3-small';
  dimensions = 1536;

  async embedText(text: string): Promise<number[]> {
    // Call OpenAI Embeddings API
    return openAiVector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embedText(t)));
  }
}

const customEngine = new MatchEngine(new OpenAIEmbeddingProvider());
```

---

## 6. CLI Testing & Verification

Run the end-to-end simulation against the seeded Lovely Professional University CSE dataset:

```bash
npm run match:test
```

This verifies the multi-tenant isolation, capacity filtering, dense vector scoring, Bayesian smoothing, and explainability reasoning across sample CSE students.
