/**
 * Local Semantic Vectorizer
 *
 * High-speed, deterministic embedding engine for semantic search.
 * Generates 128-dimensional dense unit vectors using term frequency,
 * subword hashing, and key domain concept projections.
 *
 * Operates with ZERO external network latency or paid API dependencies,
 * while matching the IEmbeddingProvider contract.
 */

import type { IEmbeddingProvider } from './provider.interface';

export class LocalSemanticVectorizer implements IEmbeddingProvider {
  public readonly name = 'local-subword-vectorizer-128d';
  public readonly dimensions = 128;

  // Domain concept seed keywords for intentional semantic bucketing
  private static readonly CONCEPT_ANCHORS: string[] = [
    // Core systems & DSA
    'distributed', 'storage', 'consensus', 'raft', 'systems', 'algorithm', 'concurrency',
    'lowlatency', 'kernel', 'performance', 'memory', 'database', 'internals', 'cache',
    // AI & Data
    'machinelearning', 'deeplearning', 'transformer', 'llm', 'generative', 'nlp', 'vision',
    'analytics', 'pipeline', 'spark', 'kafka', 'bigdata', 'feature', 'pytorch',
    // Cloud & DevOps
    'cloud', 'aws', 'azure', 'kubernetes', 'docker', 'devops', 'sre', 'microservices',
    'infrastructure', 'serverless', 'scalability', 'observability', 'terraform',
    // Web & Mobile
    'frontend', 'react', 'nextjs', 'fullstack', 'backend', 'golang', 'java', 'typescript',
    'mobile', 'android', 'ios', 'swift', 'kotlin', 'api', 'graphql',
    // Security & Web3
    'security', 'cybersecurity', 'vulnerability', 'cryptography', 'blockchain', 'solidity',
    // Career & Academic
    'interview', 'placement', 'internship', 'mentor', 'google', 'microsoft', 'amazon', 'lpu'
  ];

  /**
   * Embed a single text document into a 128-dimensional unit vector.
   */
  async embedText(text: string): Promise<number[]> {
    const tokens = this.tokenize(text);
    const vector = new Array<number>(this.dimensions).fill(0);

    if (tokens.length === 0) {
      return vector;
    }

    // 1. Term frequency with subword n-gram hashing
    for (const token of tokens) {
      const hash = this.hashString(token);
      const index = Math.abs(hash) % this.dimensions;
      vector[index] += 1.0;

      // Extract 3-grams for typo & morphology tolerance
      if (token.length > 3) {
        for (let i = 0; i <= token.length - 3; i++) {
          const gram = token.slice(i, i + 3);
          const gramIndex = Math.abs(this.hashString(gram)) % this.dimensions;
          vector[gramIndex] += 0.3;
        }
      }
    }

    // 2. Semantic anchor concept boosting
    const lowerText = text.toLowerCase();
    for (let c = 0; c < LocalSemanticVectorizer.CONCEPT_ANCHORS.length; c++) {
      const anchor = LocalSemanticVectorizer.CONCEPT_ANCHORS[c];
      if (lowerText.includes(anchor)) {
        const anchorBucket = (c * 2) % this.dimensions;
        vector[anchorBucket] += 1.8;
      }
    }

    // 3. L2 Normalization (Unit vector: ||v||_2 = 1.0)
    let normSq = 0;
    for (let i = 0; i < this.dimensions; i++) {
      normSq += vector[i] * vector[i];
    }

    const norm = Math.sqrt(normSq);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  /**
   * Batch embed multiple texts.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedText(t)));
  }

  /**
   * Clean and tokenize string into normalized alpha-numeric tokens.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  /**
   * Fast 32-bit FNV-1a hash.
   */
  private hashString(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash;
  }
}

/** Default singleton instance */
export const defaultEmbeddingProvider = new LocalSemanticVectorizer();
