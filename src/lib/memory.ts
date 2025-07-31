/**
 * PHASE 5: MEMORY & LEARNING SYSTEMS
 * Comprehensive memory management with turn-based logging and semantic search
 */

import { supabase } from '@/integrations/supabase/client';
import { createRAGService } from './ragService';
import { openaiAgent } from './openaiAgentSDK';

export interface MemoryEntry {
  id: string;
  userId: string;
  conversationId?: string;
  memoryType: 'conversation' | 'preference' | 'context' | 'summary' | 'fact';
  content: string;
  metadata: {
    domain?: string;
    importance: number;
    confidence: number;
    tags?: string[];
    entities?: string[];
    turn_number?: number;
    message_id?: string;
    turn_count_total?: number;
  };
  createdAt: string;
  expiresAt?: string;
}

export interface ConversationTurn {
  turnNumber: number;
  userMessage: string;
  agentResponse: string;
  intent?: string;
  entities?: Record<string, any>;
  context?: Record<string, any>;
  timestamp: string;
}

export interface MemoryContext {
  recentMemories: MemoryEntry[];
  relevantFacts: MemoryEntry[];
  userPreferences: MemoryEntry[];
  conversationSummary?: string;
}

/**
 * ENHANCED MEMORY MANAGER
 * Handles turn-based memory logging with semantic embeddings
 */
export class EnhancedMemoryManager {
  private ragService: any;
  private embeddingCache = new Map<string, number[]>();

  constructor() {
    // Initialize RAG service for memory embeddings
    this.ragService = createRAGService({
      indexName: 'easymo-memory'
    });
  }

  /**
   * LOG CONVERSATION TURN
   * Core method for turn-based memory logging
   */
  async logConversationTurn(
    userId: string,
    turn: ConversationTurn,
    conversationId?: string
  ): Promise<void> {
    try {
      console.log('💾 Logging conversation turn:', { userId, turnNumber: turn.turnNumber });

      // Extract key information from the turn
      const memoryEntries = await this.extractMemoriesFromTurn(userId, turn, conversationId);

      // Store memories in database and vector store
      await Promise.all([
        this.storeMemoriesInDB(memoryEntries),
        this.storeMemoriesInVector(memoryEntries)
      ]);

      // Update conversation summary if needed
      if (turn.turnNumber % 5 === 0) { // Every 5 turns
        await this.updateConversationSummary(userId, conversationId);
      }

      console.log('✅ Conversation turn logged successfully');

    } catch (error) {
      console.error('❌ Failed to log conversation turn:', error);
      throw error;
    }
  }

  /**
   * EXTRACT MEMORIES FROM TURN
   * Extract different types of memories from a conversation turn
   */
  private async extractMemoriesFromTurn(
    userId: string,
    turn: ConversationTurn,
    conversationId?: string
  ): Promise<MemoryEntry[]> {
    const memories: MemoryEntry[] = [];
    const baseMetadata = {
      turn_number: turn.turnNumber,
      message_id: `${conversationId}_${turn.turnNumber}`,
      domain: turn.context?.domain || 'general',
      timestamp: turn.timestamp
    };

    // 1. Store the raw conversation turn
    memories.push({
      id: `conv_${userId}_${Date.now()}_${turn.turnNumber}`,
      userId,
      conversationId,
      memoryType: 'conversation',
      content: `User: ${turn.userMessage}\nAgent: ${turn.agentResponse}`,
      metadata: {
        ...baseMetadata,
        importance: 0.7,
        confidence: 1.0,
        tags: ['conversation', 'turn']
      },
      createdAt: turn.timestamp
    });

    // 2. Extract preferences from user message
    const preferences = await this.extractPreferences(turn.userMessage);
    for (const pref of preferences) {
      memories.push({
        id: `pref_${userId}_${Date.now()}_${Math.random()}`,
        userId,
        conversationId,
        memoryType: 'preference',
        content: pref.content,
        metadata: {
          ...baseMetadata,
          importance: 0.9,
          confidence: pref.confidence,
          tags: ['preference', ...pref.tags]
        },
        createdAt: turn.timestamp
      });
    }

    // 3. Extract factual information
    const facts = await this.extractFacts(turn.userMessage, turn.agentResponse);
    for (const fact of facts) {
      memories.push({
        id: `fact_${userId}_${Date.now()}_${Math.random()}`,
        userId,
        conversationId,
        memoryType: 'fact',
        content: fact.content,
        metadata: {
          ...baseMetadata,
          importance: 0.8,
          confidence: fact.confidence,
          tags: ['fact', ...fact.tags],
          entities: fact.entities
        },
        createdAt: turn.timestamp
      });
    }

    // 4. Extract contextual information
    if (turn.context && Object.keys(turn.context).length > 0) {
      memories.push({
        id: `ctx_${userId}_${Date.now()}`,
        userId,
        conversationId,
        memoryType: 'context',
        content: `Context: ${JSON.stringify(turn.context)}`,
        metadata: {
          ...baseMetadata,
          importance: 0.6,
          confidence: 1.0,
          tags: ['context']
        },
        createdAt: turn.timestamp
      });
    }

    return memories;
  }

  /**
   * EXTRACT PREFERENCES
   * Extract user preferences from messages
   */
  private async extractPreferences(userMessage: string): Promise<Array<{
    content: string;
    confidence: number;
    tags: string[];
  }>> {
    const preferences: Array<{ content: string; confidence: number; tags: string[] }> = [];

    // Language preferences
    if (/kinyarwanda|rwandan|french|français/i.test(userMessage)) {
      const lang = userMessage.match(/kinyarwanda|rwandan/i) ? 'rw' : 'fr';
      preferences.push({
        content: `Prefers ${lang} language`,
        confidence: 0.8,
        tags: ['language', lang]
      });
    }

    // Location preferences
    const locationMatch = userMessage.match(/in\s+([A-Za-z\s]+)|to\s+([A-Za-z\s]+)|from\s+([A-Za-z\s]+)/i);
    if (locationMatch) {
      const location = locationMatch[1] || locationMatch[2] || locationMatch[3];
      preferences.push({
        content: `Frequently mentions location: ${location.trim()}`,
        confidence: 0.7,
        tags: ['location', 'geography']
      });
    }

    // Payment preferences
    if (/mobile\s*money|momo|cash|credit/i.test(userMessage)) {
      const paymentMethod = userMessage.match(/(mobile\s*money|momo|cash|credit)/i)?.[0];
      preferences.push({
        content: `Prefers payment method: ${paymentMethod}`,
        confidence: 0.8,
        tags: ['payment', 'finance']
      });
    }

    return preferences;
  }

  /**
   * EXTRACT FACTS
   * Extract factual information from conversation
   */
  private async extractFacts(userMessage: string, agentResponse: string): Promise<Array<{
    content: string;
    confidence: number;
    tags: string[];
    entities: string[];
  }>> {
    const facts: Array<{ content: string; confidence: number; tags: string[]; entities: string[] }> = [];

    // Phone number facts
    const phoneMatch = userMessage.match(/(\+25[0-9]{9}|07[0-9]{8})/);
    if (phoneMatch) {
      facts.push({
        content: `User phone number: ${phoneMatch[0]}`,
        confidence: 0.95,
        tags: ['contact', 'phone'],
        entities: [phoneMatch[0]]
      });
    }

    // Name extraction
    const nameMatch = userMessage.match(/my name is ([A-Za-z\s]+)/i);
    if (nameMatch) {
      facts.push({
        content: `User name: ${nameMatch[1].trim()}`,
        confidence: 0.9,
        tags: ['identity', 'name'],
        entities: [nameMatch[1].trim()]
      });
    }

    // Business information
    if (/business|company|work|job/i.test(userMessage)) {
      const businessMatch = userMessage.match(/(?:work at|business|company)\s+([A-Za-z\s]+)/i);
      if (businessMatch) {
        facts.push({
          content: `Works at/owns: ${businessMatch[1].trim()}`,
          confidence: 0.8,
          tags: ['business', 'work'],
          entities: [businessMatch[1].trim()]
        });
      }
    }

    return facts;
  }

  /**
   * STORE MEMORIES IN DATABASE
   * Store memory entries in Supabase
   */
  private async storeMemoriesInDB(memories: MemoryEntry[]): Promise<void> {
    if (memories.length === 0) return;

    const dbEntries = memories.map(memory => ({
      id: memory.id,
      user_id: memory.userId,
      memory_type: memory.memoryType,
      memory_key: `${memory.memoryType}_${memory.metadata.turn_number || 'general'}`,
      memory_value: {
        content: memory.content,
        metadata: memory.metadata
      },
      importance_weight: memory.metadata.importance,
      confidence_score: memory.metadata.confidence,
      expires_at: memory.expiresAt,
      created_at: memory.createdAt,
      updated_at: memory.createdAt
    }));

    const { error } = await supabase
      .from('agent_memory_enhanced')
      .insert(dbEntries);

    if (error) {
      console.error('❌ Failed to store memories in DB:', error);
      throw error;
    }
  }

  /**
   * STORE MEMORIES IN VECTOR STORE
   * Store memory embeddings for semantic search
   */
  private async storeMemoriesInVector(memories: MemoryEntry[]): Promise<void> {
    if (!this.ragService || memories.length === 0) return;

    try {
      const vectorMemories = memories.map(memory => ({
        id: memory.id,
        content: memory.content,
        metadata: {
          userId: memory.userId,
          domain: memory.metadata.domain || 'general',
          importance: memory.metadata.importance
        }
      }));

      await this.ragService.bulkStoreMemories(vectorMemories);
    } catch (error) {
      console.error('❌ Failed to store memories in vector store:', error);
      // Don't throw - vector storage is supplementary
    }
  }

  /**
   * RETRIEVE MEMORY CONTEXT
   * Get relevant memories for current conversation
   */
  async retrieveMemoryContext(
    userId: string,
    currentMessage: string,
    options: {
      includeConversation?: boolean;
      includeFacts?: boolean;
      includePreferences?: boolean;
      maxMemories?: number;
    } = {}
  ): Promise<MemoryContext> {
    try {
      const {
        includeConversation = true,
        includeFacts = true,
        includePreferences = true,
        maxMemories = 10
      } = options;

      console.log('🧠 Retrieving memory context for user:', userId);

      // 1. Get recent memories from database
      const recentMemories = await this.getRecentMemories(userId, maxMemories);

      // 2. Get semantically relevant memories
      const relevantMemories = await this.getRelevantMemories(userId, currentMessage, maxMemories);

      // 3. Get user preferences
      const preferences = includePreferences 
        ? await this.getUserPreferences(userId)
        : [];

      // 4. Get relevant facts
      const facts = includeFacts
        ? await this.getRelevantFacts(userId, currentMessage)
        : [];

      // 5. Get conversation summary
      const conversationSummary = await this.getConversationSummary(userId);

      return {
        recentMemories: recentMemories.slice(0, maxMemories),
        relevantFacts: facts.slice(0, 5),
        userPreferences: preferences.slice(0, 5),
        conversationSummary
      };

    } catch (error) {
      console.error('❌ Failed to retrieve memory context:', error);
      return {
        recentMemories: [],
        relevantFacts: [],
        userPreferences: []
      };
    }
  }

  /**
   * GET RECENT MEMORIES
   * Retrieve recent memories from database
   */
  private async getRecentMemories(userId: string, limit: number): Promise<MemoryEntry[]> {
    const { data, error } = await supabase
      .from('agent_memory_enhanced')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Failed to get recent memories:', error);
      return [];
    }

    return (data || []).map(this.mapDBToMemoryEntry);
  }

  /**
   * GET RELEVANT MEMORIES
   * Use semantic search to find relevant memories
   */
  private async getRelevantMemories(
    userId: string, 
    query: string, 
    limit: number
  ): Promise<MemoryEntry[]> {
    if (!this.ragService) return [];

    try {
      const results = await this.ragService.searchMemory(query, userId, {
        topK: limit,
        minScore: 0.7
      });

      return results.map(result => ({
        id: result.id,
        userId,
        memoryType: 'conversation' as const,
        content: result.content,
        metadata: result.metadata || { importance: 0.5, confidence: 0.8 },
        createdAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error('❌ Failed to get relevant memories:', error);
      return [];
    }
  }

  /**
   * GET USER PREFERENCES
   * Retrieve user preferences from memory
   */
  private async getUserPreferences(userId: string): Promise<MemoryEntry[]> {
    const { data, error } = await supabase
      .from('agent_memory_enhanced')
      .select('*')
      .eq('user_id', userId)
      .eq('memory_type', 'preference')
      .order('importance_weight', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Failed to get user preferences:', error);
      return [];
    }

    return (data || []).map(this.mapDBToMemoryEntry);
  }

  /**
   * GET RELEVANT FACTS
   * Retrieve factual information about the user
   */
  private async getRelevantFacts(userId: string, query: string): Promise<MemoryEntry[]> {
    const { data, error } = await supabase
      .from('agent_memory_enhanced')
      .select('*')
      .eq('user_id', userId)
      .eq('memory_type', 'fact')
      .order('confidence_score', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Failed to get relevant facts:', error);
      return [];
    }

    return (data || []).map(this.mapDBToMemoryEntry);
  }

  /**
   * UPDATE CONVERSATION SUMMARY
   * Create or update conversation summary
   */
  private async updateConversationSummary(
    userId: string, 
    conversationId?: string
  ): Promise<void> {
    try {
      // Get recent conversation turns
      const { data: recentTurns } = await supabase
        .from('agent_memory_enhanced')
        .select('*')
        .eq('user_id', userId)
        .eq('memory_type', 'conversation')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!recentTurns || recentTurns.length === 0) return;

      // Generate summary using OpenAI
      const conversationText = recentTurns
        .map(turn => {
          const memoryValue = turn.memory_value;
          if (typeof memoryValue === 'object' && memoryValue !== null && 'content' in memoryValue) {
            return String((memoryValue as any).content);
          }
          return String(memoryValue);
        })
        .reverse()
        .join('\n\n');

      const summary = await this.generateConversationSummary(conversationText);

      // Store summary as memory
      const summaryMemory: MemoryEntry = {
        id: `summary_${userId}_${Date.now()}`,
        userId,
        conversationId,
        memoryType: 'summary',
        content: summary,
        metadata: {
          importance: 0.95,
          confidence: 0.9,
          tags: ['summary', 'conversation'],
          turn_count_total: recentTurns.length
        },
        createdAt: new Date().toISOString()
      };

      await this.storeMemoriesInDB([summaryMemory]);

    } catch (error) {
      console.error('❌ Failed to update conversation summary:', error);
    }
  }

  /**
   * GENERATE CONVERSATION SUMMARY
   * Use OpenAI to generate conversation summary
   */
  private async generateConversationSummary(conversationText: string): Promise<string> {
    try {
      // Use direct OpenAI API call instead of agent method
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Summarize this conversation concisely, focusing on key preferences, facts, and outcomes. Keep it under 200 words.'
            },
            {
              role: 'user',
              content: `Conversation to summarize:\n\n${conversationText}`
            }
          ],
          max_tokens: 200
        })
      });

      if (!response.ok) {
        return 'Summary unavailable - OpenAI API error';
      }

      const data = await response.json();
      return data.choices[0].message.content || 'Unable to generate summary';

    } catch (error) {
      console.error('❌ Failed to generate conversation summary:', error);
      return 'Summary generation failed';
    }
  }

  /**
   * GET CONVERSATION SUMMARY
   * Retrieve latest conversation summary
   */
  private async getConversationSummary(userId: string): Promise<string | undefined> {
    const { data, error } = await supabase
      .from('agent_memory_enhanced')
      .select('*')
      .eq('user_id', userId)
      .eq('memory_type', 'summary')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return undefined;

    const memoryValue = data.memory_value;
    if (typeof memoryValue === 'object' && memoryValue !== null && 'content' in memoryValue) {
      return String((memoryValue as any).content);
    }
    return String(memoryValue);
  }

  /**
   * CLEAR USER MEMORIES
   * Remove all memories for a user
   */
  async clearUserMemories(
    userId: string,
    options: {
      memoryTypes?: string[];
      olderThan?: Date;
    } = {}
  ): Promise<void> {
    try {
      console.log('🗑️ Clearing user memories:', userId);

      let query = supabase
        .from('agent_memory_enhanced')
        .delete()
        .eq('user_id', userId);

      if (options.memoryTypes && options.memoryTypes.length > 0) {
        query = query.in('memory_type', options.memoryTypes);
      }

      if (options.olderThan) {
        query = query.lt('created_at', options.olderThan.toISOString());
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      // Also clear from vector store
      if (this.ragService) {
        await this.ragService.cleanupUserMemories(userId, {
          olderThanDays: options.olderThan ? 
            Math.floor((Date.now() - options.olderThan.getTime()) / (1000 * 60 * 60 * 24)) : 
            undefined
        });
      }

      console.log('✅ User memories cleared successfully');

    } catch (error) {
      console.error('❌ Failed to clear user memories:', error);
      throw error;
    }
  }

  /**
   * MAP DATABASE TO MEMORY ENTRY
   * Convert database record to MemoryEntry
   */
  private mapDBToMemoryEntry(dbRecord: any): MemoryEntry {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      memoryType: dbRecord.memory_type,
        content: typeof dbRecord.memory_value === 'object' && dbRecord.memory_value?.content 
          ? String(dbRecord.memory_value.content) 
          : String(dbRecord.memory_value),
      metadata: dbRecord.memory_value.metadata || {
        importance: dbRecord.importance_weight || 0.5,
        confidence: dbRecord.confidence_score || 0.8
      },
      createdAt: dbRecord.created_at,
      expiresAt: dbRecord.expires_at
    };
  }

  /**
   * GET MEMORY STATISTICS
   * Get memory usage statistics for a user
   */
  async getMemoryStatistics(userId: string): Promise<{
    totalMemories: number;
    memoryTypeBreakdown: Record<string, number>;
    oldestMemory?: string;
    newestMemory?: string;
    totalSize: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('agent_memory_enhanced')
        .select('memory_type, created_at, memory_value')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        return {
          totalMemories: 0,
          memoryTypeBreakdown: {},
          totalSize: 0
        };
      }

      const breakdown: Record<string, number> = {};
      let totalSize = 0;

      for (const memory of data) {
        breakdown[memory.memory_type] = (breakdown[memory.memory_type] || 0) + 1;
        totalSize += JSON.stringify(memory.memory_value).length;
      }

      return {
        totalMemories: data.length,
        memoryTypeBreakdown: breakdown,
        oldestMemory: data[0]?.created_at,
        newestMemory: data[data.length - 1]?.created_at,
        totalSize
      };

    } catch (error) {
      console.error('❌ Failed to get memory statistics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedMemoryManager = new EnhancedMemoryManager();