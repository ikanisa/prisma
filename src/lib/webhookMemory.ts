/**
 * PHASE 5: MEMORY WEBHOOK INTEGRATION
 * Integrates memory logging into webhook pipeline
 */

import { enhancedMemoryManager, ConversationTurn } from './memory';
import { enhancedRAGService } from './enhancedRAG';

export interface WebhookMemoryConfig {
  enableMemoryLogging: boolean;
  enableContextRetrieval: boolean;
  maxContextItems: number;
  memoryDomains: string[];
  autoSummaryTurns: number;
}

export interface WebhookMemoryData {
  conversationId?: string;
  turnNumber?: number;
  userMessage: string;
  agentResponse?: string;
  intent?: string;
  domain?: string;
  entities?: Record<string, any>;
  context?: Record<string, any>;
  phoneNumber: string;
}

/**
 * WEBHOOK MEMORY PROCESSOR
 * Handles memory logging and context retrieval for webhook messages
 */
export class WebhookMemoryProcessor {
  private config: WebhookMemoryConfig;
  private turnCounters = new Map<string, number>();

  constructor(config: Partial<WebhookMemoryConfig> = {}) {
    this.config = {
      enableMemoryLogging: true,
      enableContextRetrieval: true,
      maxContextItems: 10,
      memoryDomains: ['payments', 'mobility', 'ordering', 'listings', 'general'],
      autoSummaryTurns: 5,
      ...config
    };
  }

  /**
   * PROCESS INCOMING MESSAGE
   * Process incoming webhook message and return enhanced context
   */
  async processIncomingMessage(
    userId: string,
    messageData: WebhookMemoryData
  ): Promise<{
    enhancedContext: string;
    memoryStats: Record<string, number>;
    turnNumber: number;
  }> {
    try {
      console.log('💾 Processing webhook message with memory:', { userId, domain: messageData.domain });

      // Get or increment turn number
      const turnNumber = this.getTurnNumber(userId);

      // Get enhanced context if enabled
      let enhancedContext = '';
      let memoryStats = { documents: 0, memories: 0, preferences: 0, facts: 0 };

      if (this.config.enableContextRetrieval) {
        const ragContext = await enhancedRAGService.getEnhancedContext(
          userId,
          messageData.userMessage,
          {
            includeDocuments: true,
            includeMemories: true,
            maxDocuments: 3,
            maxMemories: this.config.maxContextItems,
            domain: messageData.domain
          }
        );

        enhancedContext = ragContext.combinedContext;
        memoryStats = ragContext.contextSources;
      }

      return {
        enhancedContext,
        memoryStats,
        turnNumber
      };

    } catch (error) {
      console.error('❌ Failed to process incoming message:', error);
      return {
        enhancedContext: '',
        memoryStats: { documents: 0, memories: 0, preferences: 0, facts: 0 },
        turnNumber: this.getTurnNumber(userId)
      };
    }
  }

  /**
   * PROCESS OUTGOING RESPONSE
   * Log the conversation turn after agent response
   */
  async processOutgoingResponse(
    userId: string,
    messageData: WebhookMemoryData,
    agentResponse: string,
    turnNumber: number
  ): Promise<void> {
    try {
      if (!this.config.enableMemoryLogging) return;

      console.log('💾 Logging conversation turn:', { userId, turnNumber });

      // Create conversation turn
      const conversationTurn: ConversationTurn = {
        turnNumber,
        userMessage: messageData.userMessage,
        agentResponse,
        intent: messageData.intent,
        entities: messageData.entities,
        context: {
          domain: messageData.domain,
          phoneNumber: messageData.phoneNumber,
          ...messageData.context
        },
        timestamp: new Date().toISOString()
      };

      // Log the turn
      await enhancedMemoryManager.logConversationTurn(
        userId,
        conversationTurn,
        messageData.conversationId
      );

      console.log('✅ Conversation turn logged successfully');

    } catch (error) {
      console.error('❌ Failed to process outgoing response:', error);
      // Don't throw - memory logging is supplementary
    }
  }

  /**
   * GET TURN NUMBER
   * Get and increment turn number for user
   */
  private getTurnNumber(userId: string): number {
    const current = this.turnCounters.get(userId) || 0;
    const next = current + 1;
    this.turnCounters.set(userId, next);
    return next;
  }

  /**
   * RESET TURN COUNTER
   * Reset turn counter for user (e.g., new conversation)
   */
  resetTurnCounter(userId: string): void {
    this.turnCounters.set(userId, 0);
  }

  /**
   * GET USER CONTEXT SUMMARY
   * Get a quick summary of user's context for webhook
   */
  async getUserContextSummary(userId: string): Promise<{
    hasMemories: boolean;
    preferredLanguage?: string;
    recentDomain?: string;
    totalMemories: number;
  }> {
    try {
      const stats = await enhancedMemoryManager.getMemoryStatistics(userId);
      
      // Get preferences to extract language
      const memoryContext = await enhancedMemoryManager.retrieveMemoryContext(
        userId,
        'language preference',
        { includePreferences: true, maxMemories: 5 }
      );

      const languagePreference = memoryContext.userPreferences
        .find(pref => pref.content.includes('language'))
        ?.content.match(/prefers\s+(\w+)/i)?.[1];

      return {
        hasMemories: stats.totalMemories > 0,
        preferredLanguage: languagePreference,
        recentDomain: Object.keys(stats.memoryTypeBreakdown)[0],
        totalMemories: stats.totalMemories
      };

    } catch (error) {
      console.error('❌ Failed to get user context summary:', error);
      return {
        hasMemories: false,
        totalMemories: 0
      };
    }
  }

  /**
   * EXTRACT WEBHOOK ENTITIES
   * Extract entities from webhook message for memory storage
   */
  extractWebhookEntities(messageText: string, domain?: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Phone number extraction
    const phoneMatch = messageText.match(/(\+25[0-9]{9}|07[0-9]{8})/);
    if (phoneMatch) {
      entities.phoneNumber = phoneMatch[0];
    }

    // Amount extraction
    const amountMatch = messageText.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rwf|frw|francs?)/i);
    if (amountMatch) {
      entities.amount = amountMatch[0];
    }

    // Location extraction
    const locationMatch = messageText.match(/(?:to|from|in)\s+([A-Za-z\s]+)/i);
    if (locationMatch) {
      entities.location = locationMatch[1].trim();
    }

    // Domain-specific extractions
    if (domain === 'payments') {
      const momoMatch = messageText.match(/(mobile\s*money|momo)/i);
      if (momoMatch) entities.paymentMethod = 'mobile_money';
    }

    if (domain === 'mobility') {
      const motoMatch = messageText.match(/(moto|bike|taxi)/i);
      if (motoMatch) entities.transportType = 'moto';
    }

    return entities;
  }

  /**
   * UPDATE CONFIG
   * Update memory processor configuration
   */
  updateConfig(newConfig: Partial<WebhookMemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Memory processor config updated:', this.config);
  }

  /**
   * GET STATISTICS
   * Get memory processor statistics
   */
  getStatistics(): {
    activeUsers: number;
    totalTurns: number;
    config: WebhookMemoryConfig;
  } {
    const totalTurns = Array.from(this.turnCounters.values())
      .reduce((sum, turns) => sum + turns, 0);

    return {
      activeUsers: this.turnCounters.size,
      totalTurns,
      config: this.config
    };
  }

  /**
   * CLEANUP INACTIVE USERS
   * Remove turn counters for inactive users
   */
  cleanupInactiveUsers(inactiveThresholdHours: number = 24): void {
    // Note: This is a simple implementation
    // In production, you'd want to track last activity timestamps
    console.log('🧹 Cleaning up inactive user turn counters');
    
    // For now, just clear counters that are very high (likely inactive)
    for (const [userId, turns] of this.turnCounters.entries()) {
      if (turns > 1000) { // Arbitrary threshold
        this.turnCounters.delete(userId);
        console.log(`Removed turn counter for user ${userId} (${turns} turns)`);
      }
    }
  }
}

// Export singleton instance
export const webhookMemoryProcessor = new WebhookMemoryProcessor();