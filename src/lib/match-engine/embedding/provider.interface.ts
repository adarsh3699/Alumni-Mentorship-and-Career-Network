/**
 * Embedding Provider Interface
 *
 * Abstract contract for vector generation.
 * Supports built-in deterministic local vectorizer or pluggable cloud embeddings (OpenAI, Ollama, HuggingFace).
 */

export interface IEmbeddingProvider {
  /**
   * Name/identifier of the embedding provider
   */
  readonly name: string;

  /**
   * Dimensionality of output vectors (e.g. 128, 384, 1536)
   */
  readonly dimensions: number;

  /**
   * Generate vector embedding for a single text document.
   */
  embedText(text: string): Promise<number[]>;

  /**
   * Batch generation of vector embeddings.
   */
  embedBatch(texts: string[]): Promise<number[][]>;
}
