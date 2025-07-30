/**
 * Agent Executor Fallback Integration
 * Phase 6: Hook AgentExecutor into webhook for free-text fallback
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runAgent } from './openai-agent.ts';

interface FallbackInput {
  waId: string;
  message: string;
  domain?: string;
  intent?: string;
  confidence?: number;
}

interface FallbackOutput {
  type: 'agent_response' | 'fallback_text';
  text: string;
  buttons?: Array<{
    id: string;
    title: string;
    payload: string;
  }>;
  metadata?: {
    agentUsed?: boolean;
    qualityScore?: number;
    toolCalls?: any[];
  };
}

/**
 * Enhanced fallback using AgentExecutor when intent classification fails
 */
export async function agentExecutorFallback(input: FallbackInput): Promise<FallbackOutput> {
  try {
    console.log('🤖 AgentExecutor fallback triggered', {
      waId: input.waId,
      domain: input.domain,
      intent: input.intent,
      confidence: input.confidence
    });

    // Determine if we should use agent fallback
    const shouldUseAgent = shouldTriggerAgentFallback(input);
    
    if (!shouldUseAgent) {
      return {
        type: 'fallback_text',
        text: "I'm not sure how to help with that. Could you try rephrasing your question?",
        metadata: { agentUsed: false }
      };
    }

    // Run agent with proper input structure
    const agentResult = await runAgent({
      agentCode: 'omni-agent', // Default omni agent for fallback
      userMessage: input.message,
      conversationId: generateConversationId(input.waId),
      waMessageId: generateMessageId(),
      userPhone: input.waId
    });

    if (!agentResult.success || !agentResult.response) {
      throw new Error(agentResult.error || 'Agent execution failed');
    }

    // Parse agent response for interactive elements
    const parsedResponse = parseAgentResponse(agentResult.response);
    
    return {
      type: 'agent_response',
      text: parsedResponse.text,
      buttons: parsedResponse.buttons,
      metadata: {
        agentUsed: true,
        qualityScore: 0.8, // Could be enhanced with actual quality scoring
        toolCalls: []
      }
    };

  } catch (error) {
    console.error('❌ Agent executor fallback error:', error);
    
    return {
      type: 'fallback_text',
      text: "I'm experiencing technical difficulties. Please try again or contact support.",
      metadata: { 
        agentUsed: false,
        error: error.message 
      }
    };
  }
}

/**
 * Determine if agent fallback should be triggered
 */
function shouldTriggerAgentFallback(input: FallbackInput): boolean {
  // Use agent for:
  // 1. Very low confidence (<0.3)
  // 2. No intent detected
  // 3. Free-form questions
  // 4. Complex multi-part requests
  
  if (!input.intent || input.intent === 'unknown') return true;
  if (input.confidence && input.confidence < 0.3) return true;
  if (input.message.includes('?') && input.message.length > 20) return true;
  if (input.message.split(' ').length > 10) return true; // Complex requests
  
  return false;
}

/**
 * Parse agent response for buttons and formatting
 */
function parseAgentResponse(response: string): { text: string; buttons?: any[] } {
  try {
    // Check if response contains JSON structure for buttons
    const jsonMatch = response.match(/\{[\s\S]*"buttons"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        text: parsed.text || response.replace(jsonMatch[0], '').trim(),
        buttons: parsed.buttons
      };
    }
    
    // Look for button patterns like [Button: Title|payload]
    const buttonPattern = /\[Button:\s*([^\|]+)\|([^\]]+)\]/g;
    const buttons: any[] = [];
    let cleanText = response;
    
    let match;
    while ((match = buttonPattern.exec(response)) !== null) {
      buttons.push({
        id: match[2].trim(),
        title: match[1].trim(),
        payload: match[2].trim()
      });
      cleanText = cleanText.replace(match[0], '');
    }
    
    return {
      text: cleanText.trim(),
      buttons: buttons.length > 0 ? buttons : undefined
    };
    
  } catch (error) {
    console.error('Error parsing agent response:', error);
    return { text: response };
  }
}

/**
 * Generate conversation ID for tracking
 */
function generateConversationId(waId: string): string {
  const timestamp = Date.now();
  return `conv_${waId}_${timestamp}`;
}

/**
 * Generate message ID for tracking
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}