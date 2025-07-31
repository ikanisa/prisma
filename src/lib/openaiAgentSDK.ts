/**
 * REAL OPENAI AGENT SDK INTEGRATION - PHASE 4
 * Direct OpenAI SDK usage with native function calling and assistants
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { PineconeRAGService, createRAGService } from './ragService';
import { toolRegistry } from '../agent/tools/registry';

const SUPABASE_URL = "https://ijblirphkrrsnxazohwt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OpenAIAgentConfig {
  openaiApiKey: string;
  pineconeApiKey?: string;
  assistantId?: string;
  model?: string;
  temperature?: number;
}

interface AgentRunInput {
  input: string;
  userId: string;
  domain?: string;
  context?: any;
  threadId?: string;
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
  threadId?: string;
  ragSources?: string[];
}

/**
 * REAL OPENAI AGENT WITH NATIVE SDK
 * Uses OpenAI Assistants API with function calling and RAG
 */
export class OpenAIAgent {
  private openai: OpenAI;
  private ragService: PineconeRAGService | null;
  private assistantId: string | null;
  private model: string;
  private temperature: number;
  private threadCache = new Map<string, string>(); // userId -> threadId

  constructor(config: OpenAIAgentConfig) {
    // Initialize OpenAI SDK
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });

    // Initialize RAG service
    this.ragService = createRAGService({
      pineconeApiKey: config.pineconeApiKey,
      openaiApiKey: config.openaiApiKey
    });

    this.assistantId = config.assistantId || null;
    this.model = config.model || 'gpt-4.1-2025-04-14';
    this.temperature = config.temperature || 0.7;

    console.log('🤖 OpenAI Agent initialized with SDK');
  }

  /**
   * MAIN AGENT RUN - Direct OpenAI SDK with function calling
   */
  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    const startTime = performance.now();
    
    try {
      console.log('🚀 OpenAI Agent processing:', {
        userId: input.userId,
        domain: input.domain,
        hasRAG: !!this.ragService
      });

      // 1. Get or create thread
      const threadId = await this.getOrCreateThread(input.userId, input.threadId);

      // 2. Retrieve relevant memories via RAG
      const ragContext = await this.retrieveRAGContext(input.input, input.userId, input.domain);

      // 3. Add user message to thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: input.input
      });

      // 4. Create and run with assistant (if available) or chat completion
      let response: AgentRunOutput;
      
      if (this.assistantId) {
        response = await this.runWithAssistant(threadId, input, ragContext);
      } else {
        response = await this.runWithChatCompletion(input, ragContext);
      }

      // 5. Store conversation in RAG for future context
      if (this.ragService) {
        await this.storeConversationMemory(input, response.output);
      }

      // 6. Add thread ID to response
      response.threadId = threadId;
      response.ragSources = ragContext.map(ctx => ctx.id);

      console.log('✅ OpenAI Agent completed in', (performance.now() - startTime).toFixed(2), 'ms');
      return response;

    } catch (error) {
      console.error('❌ OpenAI Agent error:', error);
      return {
        output: "I apologize, but I'm experiencing technical difficulties. Please try again.",
        buttons: [
          { text: "Try Again", payload: "retry" },
          { text: "Contact Support", payload: "support" }
        ],
        toolCalls: []
      };
    }
  }

  /**
   * RUN WITH OPENAI ASSISTANT - Use Assistants API
   */
  private async runWithAssistant(
    threadId: string,
    input: AgentRunInput,
    ragContext: Array<{id: string; content: string; score: number}>
  ): Promise<AgentRunOutput> {
    try {
      // Create run with tools
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId!,
        tools: this.getOpenAITools(),
        instructions: this.buildSystemPrompt(input.domain, ragContext)
      });

      // Wait for completion and handle tool calls
      const finalRun = await this.handleRunCompletion(threadId, run.id);

      // Get the assistant's response
      const messages = await this.openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        limit: 1
      });

      const assistantMessage = messages.data[0];
      const responseText = assistantMessage.content[0].type === 'text' 
        ? assistantMessage.content[0].text.value 
        : 'I processed your request.';

      return {
        output: responseText,
        buttons: this.generateContextualButtons(input.domain || 'general'),
        toolCalls: finalRun.toolCalls || []
      };

    } catch (error) {
      console.error('❌ Assistant run failed:', error);
      throw error;
    }
  }

  /**
   * RUN WITH CHAT COMPLETION - Direct chat completion with function calling
   */
  private async runWithChatCompletion(
    input: AgentRunInput,
    ragContext: Array<{id: string; content: string; score: number}>
  ): Promise<AgentRunOutput> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(input.domain, ragContext)
        },
        {
          role: 'user',
          content: input.input
        }
      ];

      // Add context if provided
      if (input.context) {
        messages.splice(1, 0, {
          role: 'system',
          content: `Additional context: ${JSON.stringify(input.context)}`
        });
      }

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: 500,
        tools: this.getOpenAITools(),
        tool_choice: 'auto'
      });

      const responseMessage = completion.choices[0].message;
      
      // Handle tool calls if present
      const toolResults = await this.handleToolCalls(responseMessage.tool_calls || []);

      // Analyze intent from response
      const intent = await this.analyzeIntent(input.input, input.domain);

      return {
        output: responseMessage.content || 'I understand your request.',
        buttons: this.generateContextualButtons(intent.intent),
        toolCalls: toolResults,
        intent: {
          domain: intent.intent,
          confidence: intent.confidence,
          entities: intent.entities
        }
      };

    } catch (error) {
      console.error('❌ Chat completion failed:', error);
      throw error;
    }
  }

  /**
   * HANDLE RUN COMPLETION - Poll until completion and handle tool calls
   */
  private async handleRunCompletion(threadId: string, runId: string): Promise<{
    status: string;
    toolCalls: Array<{name: string; args: any; result: any; latency: number}>;
  }> {
    const toolCalls: Array<{name: string; args: any; result: any; latency: number}> = [];
    
    while (true) {
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      
      if (run.status === 'completed') {
        return { status: 'completed', toolCalls };
      }
      
      if (run.status === 'requires_action') {
        const toolOutputs = [];
        
        for (const toolCall of run.required_action?.submit_tool_outputs?.tool_calls || []) {
          const startTime = performance.now();
          
          try {
            // Execute tool via our registry
            const result = await toolRegistry.executeTool(
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments)
            );
            
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify(result.data || { error: result.error })
            });

            toolCalls.push({
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments),
              result: result.data || { error: result.error },
              latency: performance.now() - startTime
            });

          } catch (error) {
            console.error(`❌ Tool execution failed: ${toolCall.function.name}`, error);
            
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify({ error: error.message })
            });
          }
        }
        
        // Submit tool outputs
        await this.openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
          tool_outputs: toolOutputs
        });
      }
      
      if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * HANDLE TOOL CALLS - Execute tool calls from chat completion
   */
  private async handleToolCalls(
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
  ): Promise<Array<{name: string; args: any; result: any; latency: number}>> {
    const results = [];

    for (const toolCall of toolCalls) {
      const startTime = performance.now();
      
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await toolRegistry.executeTool(toolCall.function.name, args);
        
        results.push({
          name: toolCall.function.name,
          args,
          result: result.data || { error: result.error },
          latency: performance.now() - startTime
        });

      } catch (error) {
        console.error(`❌ Tool call failed: ${toolCall.function.name}`, error);
        
        results.push({
          name: toolCall.function.name,
          args: {},
          result: { error: error.message },
          latency: performance.now() - startTime
        });
      }
    }

    return results;
  }

  /**
   * GET OR CREATE THREAD - Manage conversation threads
   */
  private async getOrCreateThread(userId: string, existingThreadId?: string): Promise<string> {
    try {
      // Use existing thread if provided and valid
      if (existingThreadId) {
        try {
          await this.openai.beta.threads.retrieve(existingThreadId);
          this.threadCache.set(userId, existingThreadId);
          return existingThreadId;
        } catch {
          // Thread doesn't exist, create new one
        }
      }

      // Check cache
      const cachedThreadId = this.threadCache.get(userId);
      if (cachedThreadId) {
        try {
          await this.openai.beta.threads.retrieve(cachedThreadId);
          return cachedThreadId;
        } catch {
          // Cached thread doesn't exist, remove from cache
          this.threadCache.delete(userId);
        }
      }

      // Create new thread
      const thread = await this.openai.beta.threads.create();
      this.threadCache.set(userId, thread.id);
      
      console.log('📝 Created new thread for user:', userId);
      return thread.id;

    } catch (error) {
      console.error('❌ Thread management failed:', error);
      throw error;
    }
  }

  /**
   * RETRIEVE RAG CONTEXT - Get relevant memories
   */
  private async retrieveRAGContext(
    query: string,
    userId: string,
    domain?: string
  ): Promise<Array<{id: string; content: string; score: number}>> {
    if (!this.ragService) {
      return [];
    }

    try {
      const results = await this.ragService.searchMemory(query, userId, {
        topK: 5,
        domain,
        minScore: 0.7
      });

      console.log('🧠 Retrieved RAG context:', results.length, 'memories');
      return results;

    } catch (error) {
      console.error('❌ RAG retrieval failed:', error);
      return [];
    }
  }

  /**
   * STORE CONVERSATION MEMORY - Save interaction for future context
   */
  private async storeConversationMemory(input: AgentRunInput, response: string): Promise<void> {
    if (!this.ragService) return;

    try {
      const memoryId = `conv_${input.userId}_${Date.now()}`;
      const content = `User: ${input.input}\nAssistant: ${response}`;

      await this.ragService.storeMemory(memoryId, content, {
        userId: input.userId,
        domain: input.domain || 'general',
        importance: 0.8
      });

    } catch (error) {
      console.error('❌ Failed to store conversation memory:', error);
      // Don't throw - memory storage is not critical
    }
  }

  /**
   * BUILD SYSTEM PROMPT - Rwanda-first persona with RAG context
   */
  private buildSystemPrompt(
    domain?: string,
    ragContext: Array<{id: string; content: string; score: number}> = []
  ): string {
    const contextText = ragContext.length > 0
      ? `\n\n🧠 RELEVANT CONTEXT:\n${ragContext.map(ctx => ctx.content).join('\n')}`
      : '';

    return `You are Aline, the easyMO Rwanda WhatsApp super-app assistant.

🇷🇼 RWANDA-FIRST PERSONA:
- Warm, respectful, efficient communication
- Use "Muraho!" for greetings when appropriate  
- Keep responses under 300 characters for WhatsApp
- Focus on practical, actionable solutions
- Show understanding of Rwandan culture and context

🎯 CURRENT DOMAIN: ${domain || 'general'}

🔧 AVAILABLE TOOLS:
Use the provided tools to help users with:
- Payments (QR generation, status checks)
- Transport (finding drivers, creating trips)  
- Orders (pharmacy, hardware, produce)
- Listings (properties, vehicles)
- Support (handoffs, tickets)

INSTRUCTIONS:
1. Be concise but helpful
2. Use tools for actionable requests
3. Ask for clarification when needed
4. Provide clear next steps
5. Stay within domain expertise${contextText}`;
  }

  /**
   * GET OPENAI TOOLS - Convert our tools to OpenAI format
   */
  private getOpenAITools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    const toolNames = toolRegistry.getToolNames();
    
    return toolNames.slice(0, 10).map(toolName => { // Limit to 10 tools
      const toolDef = toolRegistry.getToolDefinition(toolName);
      
      return {
        type: 'function',
        function: {
          name: toolName,
          description: toolDef?.description || `Execute ${toolName}`,
          parameters: {
            type: 'object',
            properties: {
              // Convert Zod schema to JSON schema (simplified)
              input: { type: 'object', description: 'Tool input parameters' }
            },
            required: ['input']
          }
        }
      };
    });
  }

  /**
   * ANALYZE INTENT - Simple intent analysis
   */
  private async analyzeIntent(message: string, domain?: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, any>;
  }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Analyze user intent and return JSON with: intent (payment|ride|product_browse|general), confidence (0-1), entities (extracted data)'
          },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        intent: result.intent || domain || 'general',
        confidence: result.confidence || 0.5,
        entities: result.entities || {}
      };

    } catch (error) {
      console.error('❌ Intent analysis failed:', error);
      return {
        intent: domain || 'general',
        confidence: 0.5,
        entities: {}
      };
    }
  }

  /**
   * GENERATE CONTEXTUAL BUTTONS
   */
  private generateContextualButtons(domain: string): Array<{ text: string; payload: string }> {
    const buttonMap = {
      payment: [
        { text: "💰 Generate QR", payload: "payment_qr_generate" },
        { text: "📱 Check Payment", payload: "payment_status_check" }
      ],
      ride: [
        { text: "🚖 Find Driver", payload: "mobility_find_driver" },
        { text: "🏍️ Offer Trip", payload: "mobility_offer_trip" }
      ],
      product_browse: [
        { text: "💊 Pharmacy", payload: "order_pharmacy" },
        { text: "🔧 Hardware", payload: "order_hardware" }
      ],
      general: [
        { text: "💰 Payments", payload: "domain_payments" },
        { text: "🚖 Transport", payload: "domain_mobility" },
        { text: "🛒 Orders", payload: "domain_ordering" }
      ]
    };

    return buttonMap[domain as keyof typeof buttonMap] || buttonMap.general;
  }

  /**
   * CREATE OR UPDATE ASSISTANT - Manage OpenAI Assistant
   */
  async createOrUpdateAssistant(config: {
    name: string;
    instructions: string;
    tools?: OpenAI.Beta.Assistants.AssistantCreateParams['tools'];
  }): Promise<string> {
    try {
      if (this.assistantId) {
        // Update existing assistant
        await this.openai.beta.assistants.update(this.assistantId, {
          name: config.name,
          instructions: config.instructions,
          tools: config.tools || this.getOpenAITools(),
          model: this.model
        });
        
        console.log('✅ Assistant updated:', this.assistantId);
        return this.assistantId;
      } else {
        // Create new assistant
        const assistant = await this.openai.beta.assistants.create({
          name: config.name,
          instructions: config.instructions,
          tools: config.tools || this.getOpenAITools(),
          model: this.model
        });
        
        this.assistantId = assistant.id;
        console.log('✅ Assistant created:', this.assistantId);
        return assistant.id;
      }

    } catch (error) {
      console.error('❌ Assistant management failed:', error);
      throw error;
    }
  }

  /**
   * CLEANUP - Clear caches and resources
   */
  cleanup(): void {
    this.threadCache.clear();
    this.ragService?.clearCache();
    console.log('🗑️ OpenAI Agent cleaned up');
  }
}

/**
 * CREATE OPENAI AGENT - Factory function
 */
export function createOpenAIAgent(config: {
  openaiApiKey?: string;
  pineconeApiKey?: string;
  assistantId?: string;
}): OpenAIAgent | null {
  try {
    const openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('⚠️ Missing OpenAI API key');
      return null;
    }

    return new OpenAIAgent({
      openaiApiKey,
      pineconeApiKey: config.pineconeApiKey || process.env.PINECONE_API_KEY,
      assistantId: config.assistantId
    });

  } catch (error) {
    console.error('❌ Failed to create OpenAI Agent:', error);
    return null;
  }
}

// Export singleton instance
export const openaiAgent = createOpenAIAgent({});