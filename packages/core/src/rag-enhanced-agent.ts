/**
 * RAG-Enhanced Agent Base Mixin
 * 
 * Adds RAG (Retrieval-Augmented Generation) capabilities to any agent.
 * Provides semantic search over knowledge base with category/jurisdiction filtering.
 */

import { getRAGHelper, type RAGSearchParams, type RAGChunk } from '@prisma-glow/lib';

export interface RAGContext {
  context: string;
  citations: string;
  chunks: RAGChunk[];
  searchParams: RAGSearchParams;
}

export interface RAGAgentConfig {
  /**
   * Default category filter for RAG searches
   * e.g., 'TAX', 'AUDIT', 'IFRS', 'CORPORATE'
   */
  defaultCategory?: string;

  /**
   * Default jurisdiction filter for RAG searches
   * e.g., 'RW', 'MT', 'GLOBAL'
   */
  defaultJurisdiction?: string;

  /**
   * Default tags for RAG searches
   * e.g., ['revenue-recognition', 'vat']
   */
  defaultTags?: string[];

  /**
   * Number of chunks to retrieve (default: 10)
   */
  chunkLimit?: number;

  /**
   * Minimum similarity threshold (0-1, default: 0.5)
   */
  minSimilarity?: number;

  /**
   * Whether to require RAG context for all responses (default: false)
   * If true, returns error if no relevant chunks found
   */
  requireRAG?: boolean;
}

/**
 * RAG-Enhanced Agent Mixin
 * Add RAG capabilities to any agent class
 */
export class RAGEnhancedAgent {
  protected ragConfig: RAGAgentConfig;
  protected ragHelper = getRAGHelper();

  constructor(ragConfig: RAGAgentConfig = {}) {
    this.ragConfig = {
      chunkLimit: 10,
      minSimilarity: 0.5,
      requireRAG: false,
      ...ragConfig,
    };
  }

  /**
   * Search knowledge base and get context for a query
   * 
   * @param query - User query or prompt
   * @param overrides - Override default search parameters
   * @returns RAG context with chunks and citations
   */
  protected async getRAGContext(
    query: string,
    overrides?: Partial<RAGSearchParams>
  ): Promise<RAGContext> {
    const searchParams: RAGSearchParams = {
      query,
      category: overrides?.category || this.ragConfig.defaultCategory,
      jurisdiction: overrides?.jurisdiction || this.ragConfig.defaultJurisdiction,
      tags: overrides?.tags || this.ragConfig.defaultTags,
      limit: overrides?.limit || this.ragConfig.chunkLimit,
    };

    const { context, citations, chunks } = await this.ragHelper.query(searchParams);

    // Check if we have sufficient coverage
    const hasSufficient = this.ragHelper.hasSufficientCoverage(
      chunks,
      this.ragConfig.minSimilarity
    );

    if (this.ragConfig.requireRAG && !hasSufficient) {
      throw new Error(
        `Insufficient knowledge base coverage for query. Top similarity: ${chunks[0]?.similarity || 0}`
      );
    }

    return {
      context,
      citations,
      chunks,
      searchParams,
    };
  }

  /**
   * Build system prompt with RAG context
   * 
   * @param basePrompt - Base system prompt
   * @param ragContext - RAG context from knowledge base
   * @returns Enhanced system prompt with RAG context
   */
  protected buildRAGSystemPrompt(basePrompt: string, ragContext: RAGContext): string {
    if (ragContext.chunks.length === 0) {
      return `${basePrompt}

**NOTE**: No relevant information was found in the knowledge base for this query. Rely on general domain knowledge, but acknowledge the limitation.`;
    }

    return `${basePrompt}

**CRITICAL: KNOWLEDGE BASE CONTEXT**
You MUST use ONLY the following verified sources to answer the user's question. Do NOT use your training data or make assumptions beyond what's provided.

${ragContext.context}

**SOURCES**:
${ragContext.citations}

**RULES**:
1. Always cite sources using [1], [2], etc. notation
2. If the context doesn't contain sufficient information, say so explicitly
3. Never make claims without citing a source
4. Be precise with numbers, dates, and requirements`;
  }

  /**
   * Get RAG statistics for monitoring
   */
  protected getRAGStats(ragContext: RAGContext): {
    chunksRetrieved: number;
    avgSimilarity: number;
    topSimilarity: number;
    categories: string[];
    jurisdictions: string[];
  } {
    const { chunks } = ragContext;

    return {
      chunksRetrieved: chunks.length,
      avgSimilarity:
        chunks.length > 0
          ? chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length
          : 0,
      topSimilarity: chunks[0]?.similarity || 0,
      categories: [...new Set(chunks.map((c) => c.category))],
      jurisdictions: [...new Set(chunks.map((c) => c.jurisdiction_code))],
    };
  }

  /**
   * Check if RAG should be used for this query
   * Override this in subclasses for custom logic
   */
  protected shouldUseRAG(query: string): boolean {
    // Use RAG for questions, compliance queries, technical queries
    const ragKeywords = [
      'what',
      'how',
      'when',
      'where',
      'why',
      'rate',
      'rule',
      'requirement',
      'standard',
      'guidance',
      'deadline',
      'form',
      'procedure',
    ];

    const lowerQuery = query.toLowerCase();
    return ragKeywords.some((keyword) => lowerQuery.includes(keyword));
  }
}

/**
 * Example usage:
 * 
 * class RwandaTaxAgent extends RAGEnhancedAgent {
 *   constructor() {
 *     super({
 *       defaultCategory: 'TAX',
 *       defaultJurisdiction: 'RW',
 *       chunkLimit: 10,
 *       minSimilarity: 0.5,
 *     });
 *   }
 * 
 *   async answerQuery(query: string): Promise<string> {
 *     const ragContext = await this.getRAGContext(query);
 *     const systemPrompt = this.buildRAGSystemPrompt(BASE_PROMPT, ragContext);
 *     // Call LLM with enhanced prompt...
 *   }
 * }
 */
