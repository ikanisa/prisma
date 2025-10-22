export const EMBEDDING_MODEL_OPTIONS = [
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small (default)' },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large' },
  { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002' },
] as const;

export type EmbeddingModelOption = (typeof EMBEDDING_MODEL_OPTIONS)[number]['value'];
