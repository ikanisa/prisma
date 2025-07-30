/**
 * OpenAI Agent SDK Integration for easyMO
 * Phase 5: AgentExecutor wrapper implementation
 */

import { supabase } from '@/integrations/supabase/client';

interface AgentExecutorConfig {
  assistantId?: string;
  openAIApiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

interface AgentRunInput {
  input: string;
  userId: string;
  conversationId?: string;
}

interface AgentRunOutput {
  output: string;
  buttons?: Array<{
    id: string;
    title: string;
    payload: string;
  }>;
  metadata?: {
    toolCalls?: any[];
    ragContext?: string[];
    qualityScore?: number;
    error?: string;
  };
}

export class AgentExecutor {
  /**
   * Main agent execution entry point - uses existing Chat Completions API
   */
  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    try {
      console.log('🤖 AgentExecutor.run() starting', { 
        userId: input.userId, 
        inputLength: input.input.length 
      });

      // Step 1: Retrieve RAG context
      const ragContext = await this.retrieve(input.input);
      
      // Step 2: Use existing runAgent function from openai-agent.ts
      const { data, error } = await supabase.functions.invoke('agent-router', {
        body: {
          agentCode: 'easymo_main',
          userMessage: input.input,
          history: [], // Could include conversation history here
          conversationId: input.conversationId,
          userPhone: input.userId
        }
      });

      if (error) throw error;
      
      // Step 3: Apply quality gate
      const qualityResult = await this.qualityGate(data.response || "I couldn't process your request.");
      
      return {
        output: qualityResult.enhanced_response || data.response,
        buttons: data.buttons,
        metadata: {
          ragContext,
          qualityScore: qualityResult.score,
          runId: data.runId
        }
      };
      
    } catch (error) {
      console.error('❌ AgentExecutor error:', error);
      return {
        output: "I'm experiencing technical difficulties. Please try again.",
        metadata: { error: error.message }
      };
    }
  }

  /**
   * RAG retrieval implementation using Supabase vector search
   */
  private async retrieve(query: string, k: number = 3): Promise<string[]> {
    try {
      // Use Supabase vector search on agent_document_embeddings table
      const { data, error } = await supabase
        .from('agent_document_embeddings')
        .select('chunk_text, metadata')
        .textSearch('chunk_text', query)
        .limit(k);

      if (error) {
        console.error('RAG retrieval error:', error);
        return [];
      }

      return data?.map(doc => doc.chunk_text) || [];
    } catch (error) {
      console.error('RAG retrieval failed:', error);
      return [];
    }
  }


  /**
   * Quality gate implementation
   */
  private async qualityGate(response: string): Promise<{ approved: boolean; score: number; enhanced_response?: string }> {
    try {
      // Simple quality scoring - can be enhanced with AI
      const score = this.calculateQualityScore(response);
      
      return {
        approved: score >= 0.6,
        score,
        enhanced_response: response // Could enhance with AI here
      };
    } catch (error) {
      console.error('Quality gate error:', error);
      return { approved: true, score: 0.5 };
    }
  }

  /**
   * Simple quality scoring algorithm
   */
  private calculateQualityScore(response: string): number {
    let score = 0.5; // Base score
    
    // Length check
    if (response.length > 10 && response.length < 1000) score += 0.2;
    
    // Contains helpful indicators
    if (response.includes('?') || response.includes('help') || response.includes('contact')) score += 0.1;
    
    // Not too repetitive
    const words = response.split(' ');
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size / words.length > 0.7) score += 0.2;
    
    return Math.min(score, 1.0);
  }
}

// Export singleton instance - no config needed, uses existing edge functions
export const executor = new AgentExecutor();