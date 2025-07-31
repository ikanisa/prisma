/**
 * PHASE 5: ENHANCED RAG WITH MEMORY INTEGRATION
 * Extends the existing RAG service to include personal memories
 */

import { PineconeRAGService, createRAGService } from './ragService';
import { enhancedMemoryManager, MemoryContext } from './memory';

interface EnhancedRAGContext {
  documentContext: string[];
  memoryContext: MemoryContext;
  combinedContext: string;
  contextSources: {
    documents: number;
    memories: number;
    preferences: number;
    facts: number;
  };
}

/**
 * ENHANCED RAG SERVICE WITH MEMORY
 * Combines document RAG with personal memory RAG
 */
export class EnhancedRAGService {
  private documentRAG: PineconeRAGService | null;
  private memoryRAG: PineconeRAGService | null;
  private contextCache = new Map<string, { context: EnhancedRAGContext; timestamp: number }>();

  constructor() {
    // Initialize both document and memory RAG services
    this.documentRAG = createRAGService({
      indexName: 'easymo-documents'
    });
    
    this.memoryRAG = createRAGService({
      indexName: 'easymo-memory'
    });
  }

  /**
   * ENHANCED CONTEXT RETRIEVAL
   * Retrieves both document and memory context for enhanced responses
   */
  async getEnhancedContext(
    userId: string,
    query: string,
    options: {
      includeDocuments?: boolean;
      includeMemories?: boolean;
      maxDocuments?: number;
      maxMemories?: number;
      domain?: string;
    } = {}
  ): Promise<EnhancedRAGContext> {
    try {
      const {
        includeDocuments = true,
        includeMemories = true,
        maxDocuments = 5,
        maxMemories = 10,
        domain
      } = options;

      console.log('🔍 Getting enhanced RAG context:', { userId, query: query.substring(0, 50) });

      // Check cache first
      const cacheKey = `${userId}_${query.substring(0, 100)}`;
      const cached = this.contextCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
        return cached.context;
      }

      // Get document context and memory context in parallel
      const [documentContext, memoryContext] = await Promise.all([
        includeDocuments ? this.getDocumentContext(query, maxDocuments, domain) : [],
        includeMemories ? this.getMemoryContext(userId, query, maxMemories) : {
          recentMemories: [],
          relevantFacts: [],
          userPreferences: []
        }
      ]);

      // Combine contexts intelligently
      const combinedContext = this.combineContexts(documentContext, memoryContext);

      const enhancedContext: EnhancedRAGContext = {
        documentContext,
        memoryContext,
        combinedContext,
        contextSources: {
          documents: documentContext.length,
          memories: memoryContext.recentMemories.length,
          preferences: memoryContext.userPreferences.length,
          facts: memoryContext.relevantFacts.length
        }
      };

      // Cache the result
      this.contextCache.set(cacheKey, {
        context: enhancedContext,
        timestamp: Date.now()
      });

      console.log('✅ Enhanced context retrieved:', enhancedContext.contextSources);
      return enhancedContext;

    } catch (error) {
      console.error('❌ Failed to get enhanced context:', error);
      return {
        documentContext: [],
        memoryContext: {
          recentMemories: [],
          relevantFacts: [],
          userPreferences: []
        },
        combinedContext: '',
        contextSources: {
          documents: 0,
          memories: 0,
          preferences: 0,
          facts: 0
        }
      };
    }
  }

  /**
   * GET DOCUMENT CONTEXT
   * Retrieve relevant documents using traditional RAG
   */
  private async getDocumentContext(
    query: string,
    maxResults: number,
    domain?: string
  ): Promise<string[]> {
    if (!this.documentRAG) return [];

    try {
      // Search for relevant documents
      const results = await this.documentRAG.searchMemory(
        query,
        'system', // Use system namespace for documents
        {
          topK: maxResults,
          domain,
          minScore: 0.7
        }
      );

      return results.map(result => result.content);

    } catch (error) {
      console.error('❌ Failed to get document context:', error);
      return [];
    }
  }

  /**
   * GET MEMORY CONTEXT
   * Retrieve personal memories for the user
   */
  private async getMemoryContext(
    userId: string,
    query: string,
    maxResults: number
  ): Promise<MemoryContext> {
    try {
      return await enhancedMemoryManager.retrieveMemoryContext(
        userId,
        query,
        {
          includeConversation: true,
          includeFacts: true,
          includePreferences: true,
          maxMemories: maxResults
        }
      );

    } catch (error) {
      console.error('❌ Failed to get memory context:', error);
      return {
        recentMemories: [],
        relevantFacts: [],
        userPreferences: []
      };
    }
  }

  /**
   * COMBINE CONTEXTS
   * Intelligently combine document and memory contexts
   */
  private combineContexts(
    documentContext: string[],
    memoryContext: MemoryContext
  ): string {
    const contextParts: string[] = [];

    // 1. User preferences (highest priority)
    if (memoryContext.userPreferences.length > 0) {
      const preferences = memoryContext.userPreferences
        .map(pref => pref.content)
        .join('; ');
      contextParts.push(`USER PREFERENCES: ${preferences}`);
    }

    // 2. Important facts about the user
    if (memoryContext.relevantFacts.length > 0) {
      const facts = memoryContext.relevantFacts
        .map(fact => fact.content)
        .join('; ');
      contextParts.push(`USER FACTS: ${facts}`);
    }

    // 3. Conversation summary
    if (memoryContext.conversationSummary) {
      contextParts.push(`CONVERSATION SUMMARY: ${memoryContext.conversationSummary}`);
    }

    // 4. Recent conversation context (limited)
    if (memoryContext.recentMemories.length > 0) {
      const recentContext = memoryContext.recentMemories
        .slice(0, 3) // Only most recent
        .map(memory => memory.content)
        .join('\n');
      contextParts.push(`RECENT CONTEXT:\n${recentContext}`);
    }

    // 5. Relevant documents
    if (documentContext.length > 0) {
      const docContext = documentContext
        .slice(0, 3) // Limit document context
        .join('\n\n');
      contextParts.push(`RELEVANT INFORMATION:\n${docContext}`);
    }

    return contextParts.join('\n\n---\n\n');
  }

  /**
   * STORE DOCUMENT
   * Store a document in the document RAG system
   */
  async storeDocument(
    documentId: string,
    content: string,
    metadata: {
      title?: string;
      domain?: string;
      importance?: number;
    }
  ): Promise<void> {
    if (!this.documentRAG) {
      throw new Error('Document RAG service not initialized');
    }

    try {
      await this.documentRAG.storeMemory(
        documentId,
        content,
        {
          userId: 'system',
          domain: metadata.domain || 'general',
          importance: metadata.importance || 0.5
        }
      );

      console.log('✅ Document stored in RAG system:', documentId);

    } catch (error) {
      console.error('❌ Failed to store document:', error);
      throw error;
    }
  }

  /**
   * UPDATE DOCUMENT
   * Update an existing document
   */
  async updateDocument(
    documentId: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!this.documentRAG) {
      throw new Error('Document RAG service not initialized');
    }

    try {
      await this.documentRAG.updateMemory(
        documentId,
        content,
        'system',
        metadata
      );

      console.log('✅ Document updated in RAG system:', documentId);

    } catch (error) {
      console.error('❌ Failed to update document:', error);
      throw error;
    }
  }

  /**
   * DELETE DOCUMENT
   * Remove a document from the RAG system
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.documentRAG) {
      throw new Error('Document RAG service not initialized');
    }

    try {
      await this.documentRAG.deleteMemory(documentId, 'system');
      console.log('✅ Document deleted from RAG system:', documentId);

    } catch (error) {
      console.error('❌ Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * CLEAR CACHE
   * Clear the context cache
   */
  clearCache(): void {
    this.contextCache.clear();
    console.log('🗑️ Enhanced RAG cache cleared');
  }

  /**
   * GET CACHE STATISTICS
   * Get cache usage statistics
   */
  getCacheStatistics(): {
    size: number;
    entries: Array<{ key: string; age: number; }>
  } {
    const entries = Array.from(this.contextCache.entries()).map(([key, value]) => ({
      key: key.substring(0, 50),
      age: Date.now() - value.timestamp
    }));

    return {
      size: this.contextCache.size,
      entries
    };
  }

  /**
   * HEALTH CHECK
   * Check the health of RAG services
   */
  async healthCheck(): Promise<{
    documentRAG: boolean;
    memoryRAG: boolean;
    cacheSize: number;
  }> {
    return {
      documentRAG: !!this.documentRAG,
      memoryRAG: !!this.memoryRAG,
      cacheSize: this.contextCache.size
    };
  }
}

// Export singleton instance
export const enhancedRAGService = new EnhancedRAGService();