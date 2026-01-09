import { toSql } from 'pgvector/utils';
import OpenAI from 'openai';

type PgVectorValue = number[] | Float32Array | ReadonlyArray<number>;

export function vector(values: PgVectorValue) {
  const normalised = Array.from(values);
  const serialised = toSql(normalised);
  return {
    toPostgres(): string {
      return serialised;
    },
    toSql(): string {
      return serialised;
    },
    toString(): string {
      return serialised;
    },
  };
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Embed text chunks using OpenAI embeddings API
 * @param chunks - Array of text chunks to embed
 * @param model - Embedding model to use (default: text-embedding-3-small)
 * @returns Array of embedding vectors
 */
export async function embed_chunks(
  chunks: string[],
  model: string = 'text-embedding-3-small',
): Promise<number[][]> {
  if (chunks.length === 0) {
    return [];
  }

  const client = getOpenAIClient();
  const embeddings: number[][] = [];

  // Process in batches of 100 (OpenAI limit)
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const response = await client.embeddings.create({
      model,
      input: batch,
    });

    for (const item of response.data) {
      embeddings.push(item.embedding);
    }
  }

  return embeddings;
}
