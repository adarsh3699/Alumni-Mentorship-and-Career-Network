export type { IEmbeddingProvider } from './provider.interface';
export { LocalSemanticVectorizer, defaultEmbeddingProvider } from './tfidf-vectorizer';
export { synthesizeStudentDocument, synthesizeAlumnusDocument } from './synthesis';
export { cosineSimilarity, jaccardSimilarity, coverageRatio } from './similarity';
