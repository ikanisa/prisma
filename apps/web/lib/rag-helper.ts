/**
 * RAG (Retrieval-Augmented Generation) Helper
 * 
 * Provides semantic search over knowledge_chunks using OpenAI embeddings
 * and Supabase pgvector for AI agents.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface RAGSearchParams {
  query: string;
  category?: string;
  jurisdiction?: string;
  tags?: string[];
  limit?: number;
}

export interface RAGChunk {
  chunk_id: number;
  content: string;
  category: string;
  jurisdiction_code: string;
  tags: string[];
  source_name: string;
  source_url: string;
  page_url: string;
  similarity: number;
}

export class RAGHelper {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    openaiKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  /**
   * Embed a query using OpenAI text-embedding-3-large (1536 dimensions)
   */
  async embedQuery(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
    });

    return response.data[0].embedding;
  }

  /**
   * Search knowledge base using semantic similarity
   * 
   * @param params - Search parameters
   * @returns Array of relevant chunks ordered by similarity
   */
  async searchKnowledge(params: RAGSearchParams): Promise<RAGChunk[]> {
    const { query, category, jurisdiction, tags, limit = 10 } = params;

    // 1. Embed the query
    const queryEmbedding = await this.embedQuery(query);

    // 2. Call deep_search_knowledge RPC function
    const { data, error } = await this.supabase.rpc('deep_search_knowledge', {
      query_embedding: queryEmbedding,
      p_category: category || null,
      p_jurisdiction: jurisdiction || null,
      p_tags: tags || null,
      p_limit: limit,
    });

    if (error) {
      throw new Error(`RAG search failed: ${error.message}`);
    }

    return (data || []) as RAGChunk[];
  }

  /**
   * Build context string from chunks for LLM prompt
   * 
   * @param chunks - Array of RAG chunks
   * @param maxChunks - Maximum number of chunks to include
   * @returns Formatted context string with citations
   */
  buildContext(chunks: RAGChunk[], maxChunks = 10): string {
    if (chunks.length === 0) {
      return 'No relevant information found in knowledge base.';
    }

    const topChunks = chunks.slice(0, maxChunks);

    return topChunks
      .map((chunk, idx) => {
        const citation = `[${idx + 1}] ${chunk.source_name} (${chunk.jurisdiction_code})`;
        return `${citation}\n${chunk.content}\n`;
      })
      .join('\n---\n\n');
  }

  /**
   * Build citations list for response footer
   * 
   * @param chunks - Array of RAG chunks
   * @returns Formatted citations with URLs
   */
  buildCitations(chunks: RAGChunk[]): string {
    if (chunks.length === 0) {
      return 'No sources cited.';
    }

    return chunks
      .map((chunk, idx) => {
        return `[${idx + 1}] ${chunk.source_name} - ${chunk.page_url}`;
      })
      .join('\n');
  }

  /**
   * Full RAG query: search + build context + citations
   * 
   * @param params - Search parameters
   * @returns Object with context, citations, and raw chunks
   */
  async query(params: RAGSearchParams): Promise<{
    context: string;
    citations: string;
    chunks: RAGChunk[];
  }> {
    const chunks = await this.searchKnowledge(params);
    const context = this.buildContext(chunks);
    const citations = this.buildCitations(chunks);

    return { context, citations, chunks };
  }

  /**
   * Check if RAG has sufficient coverage for a query
   * 
   * @param chunks - Search results
   * @param minSimilarity - Minimum similarity threshold (0-1)
   * @returns True if top result meets threshold
   */
  hasSufficientCoverage(chunks: RAGChunk[], minSimilarity = 0.5): boolean {
    if (chunks.length === 0) return false;
    return chunks[0].similarity >= minSimilarity;
  }
}

// Singleton instance
let ragHelperInstance: RAGHelper | null = null;

/**
 * Get singleton RAG helper instance
 * Requires environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */
export function getRAGHelper(): RAGHelper {
  if (!ragHelperInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error(
        'Missing environment variables for RAG helper: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY'
      );
    }

    ragHelperInstance = new RAGHelper(supabaseUrl, supabaseKey, openaiKey);
  }

  return ragHelperInstance;
}

/**
 * Reset RAG helper singleton (useful for testing)
 */
export function resetRAGHelper(): void {
  ragHelperInstance = null;
}
