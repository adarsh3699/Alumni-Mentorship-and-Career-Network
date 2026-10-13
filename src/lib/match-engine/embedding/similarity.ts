/**
 * Vector and Set Similarity Helpers
 */

/**
 * High-performance cosine similarity between two float vectors.
 * Returns a normalized score between 0.0 and 1.0 (assuming non-negative embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) {
    return 0;
  }

  const length = Math.min(a.length, b.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    const valA = a[i];
    const valB = b[i];
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Clamp between 0.0 and 1.0
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Jaccard similarity for taxonomy tags or strings:
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function jaccardSimilarity(listA: string[], listB: string[]): number {
  if (!listA || !listB || listA.length === 0 || listB.length === 0) {
    return 0;
  }

  const setA = new Set(listA.map((s) => s.toLowerCase().trim()));
  const setB = new Set(listB.map((s) => s.toLowerCase().trim()));

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Percentage of target items found in available items:
 * Overlap(targets, available) = |targets ∩ available| / |targets|
 */
export function coverageRatio(targets: string[], available: string[]): number {
  if (!targets || targets.length === 0) {
    return 0;
  }

  const targetSet = new Set(targets.map((s) => s.toLowerCase().trim()));
  const availableSet = new Set(available.map((s) => s.toLowerCase().trim()));

  let matchCount = 0;
  for (const item of targetSet) {
    if (availableSet.has(item)) {
      matchCount++;
    }
  }

  return matchCount / targetSet.size;
}
