/**
 * PHASE 4: COMPREHENSIVE AGENT EXECUTOR - FINAL IMPLEMENTATION
 * Integration of real OpenAI SDK, Pinecone RAG, and verified tool routing
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAIAgent, createOpenAIAgent } from './openaiAgentSDK';
import { verifiedToolRouter } from './verifiedToolRouter';
import { createRAGService } from './ragService';

const SUPABASE_URL = "https://ijblirphkrrsnxazohwt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Enhanced interfaces for full SDK
interface AgentRunInput {
  input: string;
  userId: string;
  domain?: string;
  context?: any;
  memory?: RAGMemory[];
  tools?: string[];
}

interface AgentRunOutput {
  output: string;
  buttons?: Array<{ text: string; payload: string }>;
  toolCalls?: Array<{
    name: string;
    args: any;
    result: any;
    latency: number;
  }>;
  intent?: {
    domain: string;
    confidence: number;
    entities: Record<string, any>;
  };
  memoryUpdates?: RAGMemory[];
  ragSources?: string[];
}

interface RAGMemory {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    domain: string;
    timestamp: string;
    importance: number;
    user_id: string;
  };
}

interface ToolCall {
  name: string;
  args: Record<string, any>;
}

interface IntentResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  suggested_action: string;
}

/**
 * ENHANCED AGENT EXECUTOR - PHASE 4 FINAL
 * Uses real OpenAI SDK, Pinecone RAG, and verified tool routing
 */
export class AgentExecutor {
  private openaiAgent: OpenAIAgent | null;
  private ragService: any;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing enhanced AgentExecutor...');

      // Initialize OpenAI Agent with real SDK
      this.openaiAgent = createOpenAIAgent({
        openaiApiKey: process.env.OPENAI_API_KEY,
        pineconeApiKey: process.env.PINECONE_API_KEY
      });

      // Initialize RAG service
      this.ragService = createRAGService({
        openaiApiKey: process.env.OPENAI_API_KEY,
        pineconeApiKey: process.env.PINECONE_API_KEY
      });

      this.initialized = true;
      console.log('✅ Enhanced AgentExecutor initialized with:', {
        hasOpenAI: !!this.openaiAgent,
        hasRAG: !!this.ragService
      });

    } catch (error) {
      console.error('❌ Failed to initialize enhanced AgentExecutor:', error);
      this.initialized = false;
    }
  }

  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    const startTime = performance.now();
    
    console.log('🚀 Enhanced AgentExecutor.run() - Phase 4 Final', {
      userId: input.userId,
      domain: input.domain,
      hasOpenAI: !!this.openaiAgent,
      hasRAG: !!this.ragService
    });

    try {
      // Use real OpenAI Agent if available
      if (this.openaiAgent && this.initialized) {
        console.log('🤖 Using real OpenAI Agent SDK');
        
        const response = await this.openaiAgent.run({
          input: input.input,
          userId: input.userId,
          domain: input.domain,
          context: input.context
        });

        // Convert OpenAI Agent response to our format
        return {
          output: response.output,
          buttons: response.buttons,
          toolCalls: response.toolCalls || [],
          intent: response.intent,
          ragSources: response.ragSources
        };
      }

      // Fallback to enhanced implementation
      console.log('🔄 Using fallback implementation');
      return await this.runFallback(input);

    } catch (error) {
      console.error('❌ Enhanced AgentExecutor error:', error);
      return this.getErrorResponse();
    }
  }

  /**
   * FALLBACK IMPLEMENTATION - When OpenAI Agent unavailable
   */
  private async runFallback(input: AgentRunInput): Promise<AgentRunOutput> {
    try {
      // 1. Analyze intent
      const intent = await this.analyzeIntentFallback(input.input, input.domain);

      // 2. Generate response
      const response = this.generateEnhancedResponse(input.input, intent);

      // 3. Execute any needed tools via verified router
      const toolCalls = await this.executeToolsIfNeeded(intent, input);

      // 4. Store memory if RAG available
      if (this.ragService) {
        await this.storeMemoryFallback(input, response, intent);
      }

      return {
        output: response,
        buttons: this.generateContextualButtons(intent.intent, intent.entities),
        toolCalls,
        intent: {
          domain: intent.intent,
          confidence: intent.confidence,
          entities: intent.entities
        }
      };

    } catch (error) {
      console.error('❌ Fallback implementation error:', error);
      return this.getErrorResponse();
    }
  }

  /**
   * ANALYZE INTENT - Fallback implementation
   */
  private async analyzeIntentFallback(message: string, domain?: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    suggested_action: string;
  }> {
    // Try calling omni-agent-enhanced for intent analysis
    try {
      const { data } = await sb.functions.invoke('omni-agent-enhanced', {
        body: {
          action: 'analyze_intent',
          message,
          domain
        }
      });

      if (data?.intent) {
        return data;
      }
    } catch (error) {
      console.warn('Intent analysis function unavailable, using pattern matching');
    }

    // Pattern matching fallback
    return this.patternMatchIntent(message, domain);
  }

  private patternMatchIntent(message: string, domain?: string): {
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    suggested_action: string;
  } {
    const normalizedInput = message.toLowerCase();
    
    if (normalizedInput.includes('pay') || normalizedInput.includes('payment') || normalizedInput.includes('qr')) {
      return {
        intent: 'payment',
        confidence: 0.8,
        entities: { amount: this.extractAmount(message) },
        suggested_action: 'generate_qr'
      };
    }
    
    if (normalizedInput.includes('trip') || normalizedInput.includes('driver') || normalizedInput.includes('ride')) {
      return {
        intent: 'ride',
        confidence: 0.8,
        entities: { location: this.extractLocation(message) },
        suggested_action: 'find_driver'
      };
    }
    
    if (normalizedInput.includes('order') || normalizedInput.includes('buy') || normalizedInput.includes('product')) {
      return {
        intent: 'product_browse',
        confidence: 0.7,
        entities: { category: this.extractCategory(message) },
        suggested_action: 'browse_products'
      };
    }
    
    return {
      intent: domain || 'general',
      confidence: 0.5,
      entities: {},
      suggested_action: 'generate_response'
    };
  }

  /**
   * EXECUTE TOOLS IF NEEDED - Use verified tool router
   */
  private async executeToolsIfNeeded(
    intent: any,
    input: AgentRunInput
  ): Promise<Array<{name: string; args: any; result: any; latency: number}>> {
    const toolCalls = [];

    try {
      // Determine if tools are needed based on intent
      if (intent.suggested_action === 'generate_qr' && intent.entities.amount) {
        const result = await verifiedToolRouter.executeTool(
          'qr_render',
          {
            amount: intent.entities.amount,
            phone: input.userId,
            description: 'Payment request'
          },
          {
            userId: input.userId,
            domain: intent.intent
          }
        );

        toolCalls.push({
          name: 'qr_render',
          args: { amount: intent.entities.amount },
          result: result.data,
          latency: result.execution_time_ms
        });
      }

      // Add more tool executions based on intent
      if (intent.suggested_action === 'find_driver' && intent.entities.location) {
        // Could execute location-based search tools
      }

    } catch (error) {
      console.error('❌ Tool execution error:', error);
    }

    return toolCalls;
  }

  /**
   * STORE MEMORY - Fallback implementation
   */
  private async storeMemoryFallback(
    input: AgentRunInput,
    response: string,
    intent: any
  ): Promise<void> {
    if (!this.ragService) return;

    try {
      const memoryId = `conv_${input.userId}_${Date.now()}`;
      const content = `User: ${input.input}\nAssistant: ${response}`;

      await this.ragService.storeMemory(memoryId, content, {
        userId: input.userId,
        domain: intent.intent,
        importance: intent.confidence
      });

    } catch (error) {
      console.error('❌ Memory storage error:', error);
    }
  }

  /**
   * ENHANCED RESPONSE GENERATION
   */
  private generateEnhancedResponse(input: string, intent: any): string {
    const responses = {
      payment: "Muraho! I can help you with payments. Would you like to generate a QR code or check a payment status?",
      ride: "I can help you find transport! Are you looking for a moto ride or offering a trip?",
      product_browse: "I can help you browse products! What would you like - pharmacy items, hardware, or fresh produce?",
      general: "Muraho! I'm your easyMO assistant. I can help with payments, transport, orders, and more. What would you like to do?"
    };

    const baseResponse = responses[intent.intent as keyof typeof responses] || responses.general;
    
    // Add context-specific information
    if (intent.entities.amount) {
      return `${baseResponse} I see you mentioned ${intent.entities.amount} RWF.`;
    }
    
    if (intent.entities.location) {
      return `${baseResponse} I see you mentioned ${intent.entities.location}.`;
    }

    return baseResponse;
  }

  /**
   * UTILITY METHODS
   */
  private extractAmount(message: string): number | null {
    const amountMatch = message.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    return amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;
  }

  private extractLocation(message: string): string | null {
    const locationWords = ['kigali', 'nyamirambo', 'remera', 'kimisagara', 'airport'];
    const lowerMessage = message.toLowerCase();
    return locationWords.find(loc => lowerMessage.includes(loc)) || null;
  }

  private extractCategory(message: string): string | null {
    const categories = ['pharmacy', 'hardware', 'farm', 'bar'];
    const lowerMessage = message.toLowerCase();
    return categories.find(cat => lowerMessage.includes(cat)) || null;
  }

  private generateContextualButtons(
    domain: string,
    entities: Record<string, any> = {}
  ): Array<{ text: string; payload: string }> {
    const baseButtons = {
      payment: [
        { text: "💰 Generate QR", payload: "payment_qr_generate" },
        { text: "📱 Check Payment", payload: "payment_status_check" },
        { text: "💸 Send Money", payload: "payment_send_money" }
      ],
      ride: [
        { text: "🚖 Find Driver", payload: "mobility_find_driver" },
        { text: "🏍️ Offer Trip", payload: "mobility_offer_trip" },
        { text: "📍 Share Location", payload: "mobility_share_location" }
      ],
      product_browse: [
        { text: "💊 Pharmacy", payload: "order_pharmacy" },
        { text: "🔧 Hardware", payload: "order_hardware" },
        { text: "🌾 Fresh Produce", payload: "order_farmers" }
      ],
      general: [
        { text: "💰 Payments", payload: "domain_payments" },
        { text: "🚖 Transport", payload: "domain_mobility" },
        { text: "🛒 Orders", payload: "domain_ordering" },
        { text: "🏠 Listings", payload: "domain_listings" }
      ]
    };

    return baseButtons[domain as keyof typeof baseButtons] || baseButtons.general;
  }

  private getErrorResponse(): AgentRunOutput {
    return {
      output: "I apologize, but I'm experiencing technical difficulties. Please try again or contact support if the issue persists.",
      buttons: [
        { text: "Try Again", payload: "retry" },
        { text: "Contact Support", payload: "support" }
      ],
      toolCalls: []
    };
  }

  /**
   * CHECK SYSTEM HEALTH
   */
  public getSystemHealth(): {
    openaiAgent: boolean;
    ragService: boolean;
    toolRouter: boolean;
    verifiedFunctions: string[];
  } {
    return {
      openaiAgent: !!this.openaiAgent && this.initialized,
      ragService: !!this.ragService,
      toolRouter: true, // verifiedToolRouter is always available
      verifiedFunctions: verifiedToolRouter.getVerifiedFunctions()
    };
  }

  /**
   * CLEANUP RESOURCES
   */
  public cleanup(): void {
    this.openaiAgent?.cleanup();
    this.ragService?.clearCache();
    console.log('🗑️ AgentExecutor cleaned up');
  }
}

// Export enhanced singleton instance
export const executor = new AgentExecutor();