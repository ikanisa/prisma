import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DeepSearchParams, DeepSearchResult } from '../deep-search-wrapper';

export interface SupabaseDeepSearchConfig {
  url: string;
  key: string;
  embeddingModel?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  openaiApiKey?: string;
}

export class SupabaseDeepSearch {
  private supabase: SupabaseClient;
  private embeddingModel: string;
  private openaiApiKey?: string;

  constructor(config: SupabaseDeepSearchConfig) {
    this.supabase = createClient(config.url, config.key);
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
    this.openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
  }

  /**
   * Generate embedding for query using OpenAI
   */
  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key required for embeddings');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Search knowledge base using vector similarity
   */
  async search(params: DeepSearchParams): Promise<DeepSearchResult[]> {
    // Generate embedding for query
    const embedding = await this.getEmbedding(params.query);

    // Build RPC call parameters
    const rpcParams: Record<string, any> = {
      query_embedding: embedding,
      match_threshold: params.minSimilarity || 0.72,
      match_count: params.matchCount || 15,
    };

    // Add filters if provided
    if (params.category) {
      rpcParams.filter_category = params.category;
    }

    if (params.jurisdictions && params.jurisdictions.length > 0) {
      rpcParams.filter_jurisdictions = params.jurisdictions;
    }

    if (params.tags && params.tags.length > 0) {
      rpcParams.filter_tags = params.tags;
    }

    // Call Supabase RPC function
    const { data, error } = await this.supabase.rpc(
      'match_kb_documents',
      rpcParams
    );

    if (error) {
      throw new Error(`Supabase search error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform Supabase results to DeepSearchResult format
    return data.map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: {
        source: row.metadata?.source || row.source || 'Unknown',
        category: row.metadata?.category || row.category,
        jurisdiction: row.metadata?.jurisdiction || row.jurisdiction,
        tags: row.metadata?.tags || row.tags || [],
        similarity: row.similarity,
        ...row.metadata,
      },
    }));
  }

  /**
   * Health check - verify Supabase connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('kb_documents')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get document count by category
   */
  async getDocumentStats(): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('kb_documents')
      .select('category');

    if (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }

    const stats: Record<string, number> = {};
    for (const row of data || []) {
      const category = row.category || 'Unknown';
      stats[category] = (stats[category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Batch embed and insert documents
   */
  async insertDocuments(
    documents: Array<{
      content: string;
      metadata: {
        source: string;
        category: string;
        jurisdiction?: string;
        tags?: string[];
        [key: string]: any;
      };
    }>
  ): Promise<void> {
    const rows = [];

    for (const doc of documents) {
      const embedding = await this.getEmbedding(doc.content);
      
      rows.push({
        content: doc.content,
        embedding,
        metadata: doc.metadata,
        category: doc.metadata.category,
        jurisdiction: doc.metadata.jurisdiction,
        tags: doc.metadata.tags || [],
      });
    }

    const { error } = await this.supabase
      .from('kb_documents')
      .insert(rows);

    if (error) {
      throw new Error(`Failed to insert documents: ${error.message}`);
    }
  }
}
