/**
 * Finance Review System - Retrieval Utilities
 * 
 * Hybrid retrieval combining vector similarity search with SQL filters
 * for context-aware financial review.
 * 
 * @module finance-review/retrieval
 */

import { supabaseAdmin } from './supabase';
import { embedText } from './embeddings';
import { financeReviewEnv } from './env';

/**
 * Result from vector similarity search
 */
export interface RetrievalResult {
  /** ID of the matched object */
  object_id: string;
  /** Type of matched object */
  object_type: string;
  /** Text chunk that was matched */
  chunk_text: string;
  /** Cosine similarity score (0-1) */
  similarity: number;
}

/**
 * Retrieve relevant context for financial review
 * 
 * Performs semantic search over ledger entries and documents
 * using vector similarity.
 * 
 * @param query - Natural language query
 * @param orgId - Organization ID to scope search
 * @param limit - Maximum number of results to return
 * @param threshold - Minimum similarity threshold (0-1)
 * @returns Array of relevant chunks sorted by similarity
 */
export async function retrieveRelevant(
  query: string,
  orgId: string = financeReviewEnv.DEFAULT_ORG_ID,
  limit: number = 12,
  threshold: number = 0.7
): Promise<RetrievalResult[]> {
  // Generate query embedding
  const queryVector = await embedText(query);
  
  // Call RPC function for vector search
  const { data, error } = await supabaseAdmin.rpc('match_embeddings', {
    p_org_id: orgId,
    query_vector: queryVector,
    match_threshold: threshold,
    match_count: limit,
  });
  
  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }
  
  return (data || []) as RetrievalResult[];
}

/**
 * Retrieve context with explicit object type filter
 * 
 * @param query - Natural language query
 * @param objectType - Filter by object type ('ledger' or 'doc')
 * @param orgId - Organization ID to scope search
 * @param limit - Maximum number of results to return
 * @returns Array of relevant chunks of specified type
 */
export async function retrieveByType(
  query: string,
  objectType: 'ledger' | 'doc',
  orgId: string = financeReviewEnv.DEFAULT_ORG_ID,
  limit: number = 12
): Promise<RetrievalResult[]> {
  const results = await retrieveRelevant(query, orgId, limit * 2, 0.7);
  
  // Filter by type and take top N
  return results
    .filter((r) => r.object_type === objectType)
    .slice(0, limit);
}

/**
 * Combine multiple queries into single context
 * Useful for multi-faceted reviews (e.g., float + tax + controls)
 * 
 * @param queries - Array of query strings
 * @param orgId - Organization ID
 * @param limitPerQuery - Max results per query
 * @returns Deduplicated array of results
 */
export async function retrieveMultiQuery(
  queries: string[],
  orgId: string = financeReviewEnv.DEFAULT_ORG_ID,
  limitPerQuery: number = 6
): Promise<RetrievalResult[]> {
  const allResults = await Promise.all(
    queries.map((q) => retrieveRelevant(q, orgId, limitPerQuery, 0.7))
  );
  
  // Flatten and deduplicate by object_id
  const seen = new Set<string>();
  const deduped: RetrievalResult[] = [];
  
  for (const results of allResults) {
    for (const result of results) {
      const key = `${result.object_type}:${result.object_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(result);
      }
    }
  }
  
  // Sort by similarity descending
  return deduped.sort((a, b) => b.similarity - a.similarity);
}
