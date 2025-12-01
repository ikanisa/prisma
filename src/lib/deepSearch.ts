/**
 * DeepSearch: RAG client for knowledge base vector search
 * Integrates OpenAI embeddings + Supabase RPC for semantic retrieval
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type DeepSearchResult = {
  id: number;
  content: string;
  similarity: number;
  source_name: string;
  page_url: string;
  category: string;
  jurisdiction_code: string;
  tags: string[];
};

export type DeepSearchParams = {
  query: string;
  matchCount?: number;
  category?: string | null;
  jurisdictionCode?: string | null;
};

/**
 * Semantic search over curated knowledge base
 * Uses text-embedding-3-large for query encoding
 * Filters by category (IFRS, TAX, etc.) and jurisdiction (RW, MT, GLOBAL)
 */
export async function deepSearch(params: DeepSearchParams): Promise<DeepSearchResult[]> {
  const { query, matchCount = 10, category = null, jurisdictionCode = null } = params;

  // Generate embedding for query
  const emb = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
  });

  const queryEmbedding = emb.data[0].embedding;

  // Call Supabase RPC for vector similarity search
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding as unknown as string, // pgvector type casting
    match_count: matchCount,
    filter_category: category,
    filter_jurisdiction: jurisdictionCode,
  });

  if (error) {
    throw new Error(`DeepSearch RPC failed: ${error.message}`);
  }

  return (data as DeepSearchResult[]) || [];
}

/**
 * Helper: Search with explicit category/jurisdiction presets
 */
export const deepSearchPresets = {
  ifrs: (query: string, matchCount = 10) =>
    deepSearch({ query, category: 'IFRS', jurisdictionCode: 'GLOBAL', matchCount }),

  taxRwanda: (query: string, matchCount = 10) =>
    deepSearch({ query, category: 'TAX', jurisdictionCode: 'RW', matchCount }),

  taxMalta: (query: string, matchCount = 10) =>
    deepSearch({ query, category: 'TAX', jurisdictionCode: 'MT', matchCount }),

  isa: (query: string, matchCount = 10) =>
    deepSearch({ query, category: 'ISA', jurisdictionCode: 'GLOBAL', matchCount }),

  corpMalta: (query: string, matchCount = 10) =>
    deepSearch({ query, category: 'CORP', jurisdictionCode: 'MT', matchCount }),
};
