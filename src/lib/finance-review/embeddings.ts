/**
 * Finance Review System - Embeddings Generation
 * 
 * Generate and store OpenAI embeddings for semantic search
 * over ledger entries and supporting documents.
 * 
 * @module finance-review/embeddings
 */

import OpenAI from 'openai';
import { financeReviewEnv } from './env';
import { supabaseAdmin } from './supabase';

const openai = new OpenAI({ apiKey: financeReviewEnv.OPENAI_API_KEY });

/**
 * Generate embedding vector for text using OpenAI
 * @param text - Input text to embed (truncated to 8000 chars)
 * @returns Embedding vector (1536 dimensions for text-embedding-3-small)
 */
export async function embedText(text: string): Promise<number[]> {
  const truncated = text.slice(0, 8000);
  
  const response = await openai.embeddings.create({
    model: financeReviewEnv.EMBEDDING_MODEL,
    input: truncated,
  });
  
  return response.data[0].embedding;
}

/**
 * Parameters for upserting an embedding
 */
export interface UpsertEmbeddingParams {
  /** Organization ID */
  orgId: string;
  /** Type of object being embedded */
  objectType: 'ledger' | 'doc';
  /** ID of the object (ledger entry or document) */
  objectId: string;
  /** Text content to embed */
  text: string;
}

/**
 * Generate embedding and upsert to database
 * 
 * @param params - Embedding parameters
 * @throws Error if embedding generation or database operation fails
 */
export async function upsertEmbedding(params: UpsertEmbeddingParams): Promise<void> {
  const { orgId, objectType, objectId, text } = params;
  
  // Generate embedding vector
  const vector = await embedText(text);
  
  // Upsert to database (using service role to bypass RLS)
  // Use composite conflict resolution on org_id, object_type, object_id
  // to properly handle updates to existing embeddings for the same object
  const { error } = await supabaseAdmin
    .from('embeddings')
    .upsert({
      org_id: orgId,
      object_type: objectType,
      object_id: objectId,
      chunk_text: text,
      vector,
    }, {
      onConflict: 'org_id,object_type,object_id',
    });
  
  if (error) {
    throw new Error(`Failed to upsert embedding: ${error.message}`);
  }
}

/**
 * Batch generate embeddings for multiple items
 * 
 * @param items - Array of embedding parameters
 * @returns Number of successfully generated embeddings
 */
export async function batchUpsertEmbeddings(
  items: UpsertEmbeddingParams[]
): Promise<number> {
  let successCount = 0;
  
  for (const item of items) {
    try {
      await upsertEmbedding(item);
      successCount++;
    } catch (error) {
      console.error(`Failed to embed ${item.objectType}:${item.objectId}`, error);
    }
  }
  
  return successCount;
}
