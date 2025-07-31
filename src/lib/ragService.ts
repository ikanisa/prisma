/**
 * REAL PINECONE RAG INTEGRATION - PHASE 4
 * Proper vector storage and retrieval with Pinecone SDK
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

interface RAGConfig {
  pineconeApiKey: string;
  openaiApiKey: string;
  indexName: string;
  namespace?: string;
}

interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    content: string;
    userId: string;
    domain: string;
    timestamp: string;
    importance: number;
  };
}

interface RAGSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

/**
 * REAL PINECONE RAG SERVICE
 * Handles vector embeddings, storage, and semantic search
 */
export class PineconeRAGService {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;
  private embeddingCache = new Map<string, number[]>();

  constructor(config: RAGConfig) {
    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: config.pineconeApiKey
    });

    // Initialize OpenAI for embeddings
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });

    this.indexName = config.indexName;
  }

  /**
   * STORE MEMORY - Convert text to vectors and store in Pinecone
   */
  async storeMemory(
    id: string,
    content: string,
    metadata: {
      userId: string;
      domain: string;
      importance?: number;
    }
  ): Promise<void> {
    try {
      console.log('🧠 Storing memory in Pinecone:', { id, contentLength: content.length });

      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Prepare vector record
      const vector: VectorRecord = {
        id,
        values: embedding,
        metadata: {
          content,
          userId: metadata.userId,
          domain: metadata.domain,
          timestamp: new Date().toISOString(),
          importance: metadata.importance || 0.5
        }
      };

      // Get Pinecone index
      const index = this.pinecone.Index(this.indexName);

      // Upsert vector with namespace
      const namespace = `user_${metadata.userId}`;
      await index.namespace(namespace).upsert([vector]);

      console.log('✅ Memory stored successfully in namespace:', namespace);

    } catch (error) {
      console.error('❌ Failed to store memory:', error);
      throw new Error(`Failed to store memory: ${error.message}`);
    }
  }

  /**
   * SEARCH MEMORY - Semantic search for relevant memories
   */
  async searchMemory(
    query: string,
    userId: string,
    options: {
      topK?: number;
      domain?: string;
      minScore?: number;
    } = {}
  ): Promise<RAGSearchResult[]> {
    try {
      console.log('🔍 Searching memory in Pinecone:', { query: query.substring(0, 50), userId });

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Get Pinecone index
      const index = this.pinecone.Index(this.indexName);
      const namespace = `user_${userId}`;

      // Build filter
      let filter: Record<string, any> = {
        userId: { $eq: userId }
      };

      if (options.domain) {
        filter.domain = { $eq: options.domain };
      }

      // Search vectors
      const searchResponse = await index.namespace(namespace).query({
        vector: queryEmbedding,
        topK: options.topK || 5,
        includeMetadata: true,
        filter
      });

      // Process results
      const results: RAGSearchResult[] = searchResponse.matches
        ?.filter(match => match.score && match.score >= (options.minScore || 0.7))
        .map(match => ({
          id: match.id,
          content: match.metadata?.content as string || '',
          score: match.score || 0,
          metadata: match.metadata || {}
        })) || [];

      console.log('✅ Found memories:', results.length);
      return results;

    } catch (error) {
      console.error('❌ Failed to search memory:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * UPDATE MEMORY - Update existing memory
   */
  async updateMemory(
    id: string,
    content: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Generate new embedding
      const embedding = await this.generateEmbedding(content);

      // Update vector
      const vector: VectorRecord = {
        id,
        values: embedding,
        metadata: {
          content,
          userId,
          domain: metadata.domain || 'general',
          timestamp: new Date().toISOString(),
          importance: metadata.importance || 0.5
        }
      };

      const index = this.pinecone.Index(this.indexName);
      const namespace = `user_${userId}`;
      
      await index.namespace(namespace).upsert([vector]);
      console.log('✅ Memory updated successfully');

    } catch (error) {
      console.error('❌ Failed to update memory:', error);
      throw new Error(`Failed to update memory: ${error.message}`);
    }
  }

  /**
   * DELETE MEMORY - Remove memory from Pinecone
   */
  async deleteMemory(id: string, userId: string): Promise<void> {
    try {
      const index = this.pinecone.Index(this.indexName);
      const namespace = `user_${userId}`;
      
      await index.namespace(namespace).deleteOne(id);
      console.log('✅ Memory deleted successfully');

    } catch (error) {
      console.error('❌ Failed to delete memory:', error);
      throw new Error(`Failed to delete memory: ${error.message}`);
    }
  }

  /**
   * BULK STORE - Store multiple memories efficiently
   */
  async bulkStoreMemories(
    memories: Array<{
      id: string;
      content: string;
      metadata: {
        userId: string;
        domain: string;
        importance?: number;
      };
    }>
  ): Promise<void> {
    try {
      console.log('📦 Bulk storing memories:', memories.length);

      // Generate embeddings for all content
      const embeddings = await Promise.all(
        memories.map(memory => this.generateEmbedding(memory.content))
      );

      // Create vector records
      const vectors: VectorRecord[] = memories.map((memory, index) => ({
        id: memory.id,
        values: embeddings[index],
        metadata: {
          content: memory.content,
          userId: memory.metadata.userId,
          domain: memory.metadata.domain,
          timestamp: new Date().toISOString(),
          importance: memory.metadata.importance || 0.5
        }
      }));

      // Group by user namespace
      const vectorsByNamespace = vectors.reduce((acc, vector) => {
        const namespace = `user_${vector.metadata.userId}`;
        if (!acc[namespace]) acc[namespace] = [];
        acc[namespace].push(vector);
        return acc;
      }, {} as Record<string, VectorRecord[]>);

      // Upsert to each namespace
      const index = this.pinecone.Index(this.indexName);
      
      await Promise.all(
        Object.entries(vectorsByNamespace).map(([namespace, namespaceVectors]) =>
          index.namespace(namespace).upsert(namespaceVectors)
        )
      );

      console.log('✅ Bulk storage completed');

    } catch (error) {
      console.error('❌ Bulk storage failed:', error);
      throw new Error(`Bulk storage failed: ${error.message}`);
    }
  }

  /**
   * GENERATE EMBEDDING - Create vector representation
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Check cache first
      const cacheKey = text.substring(0, 100);
      if (this.embeddingCache.has(cacheKey)) {
        return this.embeddingCache.get(cacheKey)!;
      }

      // Generate embedding via OpenAI
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });

      const embedding = response.data[0].embedding;

      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding);

      // Limit cache size
      if (this.embeddingCache.size > 1000) {
        const firstKey = this.embeddingCache.keys().next().value;
        this.embeddingCache.delete(firstKey);
      }

      return embedding;

    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * GET INDEX STATS - Monitor index usage
   */
  async getIndexStats(): Promise<{
    totalVectors: number;
    dimension: number;
    namespaces: string[];
  }> {
    try {
      const index = this.pinecone.Index(this.indexName);
      const stats = await index.describeIndexStats();

      return {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension || 0,
        namespaces: Object.keys(stats.namespaces || {})
      };

    } catch (error) {
      console.error('❌ Failed to get index stats:', error);
      return {
        totalVectors: 0,
        dimension: 0,
        namespaces: []
      };
    }
  }

  /**
   * CLEANUP NAMESPACE - Remove old memories for a user
   */
  async cleanupUserMemories(
    userId: string,
    options: {
      olderThanDays?: number;
      keepTopK?: number;
    } = {}
  ): Promise<void> {
    try {
      console.log('🧹 Cleaning up memories for user:', userId);

      const namespace = `user_${userId}`;
      const index = this.pinecone.Index(this.indexName);

      if (options.olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);

        // Query old vectors
        const oldVectors = await index.namespace(namespace).query({
          vector: new Array(1536).fill(0), // Dummy vector for metadata filtering
          topK: 10000,
          includeMetadata: true,
          filter: {
            timestamp: { $lt: cutoffDate.toISOString() }
          }
        });

        // Delete old vectors
        if (oldVectors.matches && oldVectors.matches.length > 0) {
          const idsToDelete = oldVectors.matches.map(match => match.id);
          await index.namespace(namespace).deleteMany(idsToDelete);
          console.log('🗑️ Deleted old memories:', idsToDelete.length);
        }
      }

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      // Don't throw - cleanup is not critical
    }
  }

  /**
   * CLEAR CACHE - Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
    console.log('🗑️ Embedding cache cleared');
  }
}

/**
 * Create RAG service instance
 */
export function createRAGService(config: {
  pineconeApiKey?: string;
  openaiApiKey?: string;
  indexName?: string;
}): PineconeRAGService | null {
  try {
    const pineconeApiKey = config.pineconeApiKey || process.env.PINECONE_API_KEY;
    const openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    const indexName = config.indexName || 'easymo-agent-memory';

    if (!pineconeApiKey || !openaiApiKey) {
      console.warn('⚠️ Missing API keys for RAG service');
      return null;
    }

    return new PineconeRAGService({
      pineconeApiKey,
      openaiApiKey,
      indexName
    });

  } catch (error) {
    console.error('❌ Failed to create RAG service:', error);
    return null;
  }
}