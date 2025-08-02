import { supabaseClient } from "./client.ts";
/**
 * Agent Router Edge Function
 * Routes WhatsApp messages to appropriate AI agents and handles responses
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { runAgent, updateAgentAssistantId } from "../_shared/openai-agent.ts";
import { getEnv, validateRequiredEnvVars } from "../_shared/env.ts";

// Validate required environment variables
const envValidation = validateRequiredEnvVars();
if (!envValidation.isValid) {
  throw new Error(`Missing required environment variables: ${envValidation.missing.join(', ')}`);
}

const supabase = getSupabaseClient();

// Update agent assistant ID on startup
await updateAgentAssistantId();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info('Agent router request received');
    
    // Parse request body
    const body = await req.json();
    const { wa_message_id, agent_code = 'easymo_main', test_mode = false } = body;
    
    if (!wa_message_id && !test_mode) {
      return createErrorResponse('wa_message_id is required', null, 400);
    }
    
    let userMessage: string;
    let userPhone: string;
    let conversationId: string | undefined;
    let history: any[] = [];
    
    if (test_mode) {
      // Test mode for admin UI
      userMessage = body.message || 'Hello';
      userPhone = body.phone || '+250700000000';
    } else {
      // Production mode: load WhatsApp message and conversation history
      const messageData = await loadWhatsAppMessage(wa_message_id);
      if (!messageData) {
        return createErrorResponse('WhatsApp message not found', null, 404);
      }
      
      userMessage = messageData.message;
      userPhone = messageData.phone;
      conversationId = messageData.conversation_id;
      
      // Load recent conversation history (last 10 messages)
      history = await loadConversationHistory(userPhone, 10);
    }
    
    logger.info('Processing message with agent', { 
      agent_code, 
      userPhone: userPhone.slice(-4),
      messageLength: userMessage.length,
      testMode: test_mode
    });
    
    // Run the agent
    const agentResult = await runAgent({
      agentCode: agent_code,
      userMessage,
      history,
      conversationId,
      waMessageId: wa_message_id,
      userPhone
    });
    
    if (!agentResult.success) {
      // Send fallback message in production
      if (!test_mode) {
        await sendFallbackMessage(userPhone);
      }
      
      return createErrorResponse(
        agentResult.error || 'Agent execution failed', 
        { runId: agentResult.runId }, 
        500
      );
    }
    
    // Send response back to WhatsApp (production only)
    if (!test_mode && agentResult.response) {
      await sendWhatsAppResponse(userPhone, agentResult.response, conversationId);
    }
    
    logger.info('Agent router completed successfully', { 
      runId: agentResult.runId,
      responseLength: agentResult.response?.length || 0,
      testMode: test_mode
    });
    
    return createSuccessResponse({
      message: 'Agent executed successfully',
      runId: agentResult.runId,
      response: agentResult.response,
      agent_code
    });
    
  } catch (error) {
    logger.error('Agent router error', error);
    return createErrorResponse('Internal server error', null, 500);
  }
});

/**
 * Load WhatsApp message from database
 */
async function loadWhatsAppMessage(messageId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('id', messageId)
      .eq('sender', 'user')
      .single();
    
    if (error) {
      logger.error('Error loading WhatsApp message', error);
      return null;
    }
    
    return {
      message: data.message_text,
      phone: data.phone_number,
      conversation_id: data.conversation_id
    };
  } catch (error) {
    logger.error('Error loading WhatsApp message', error);
    return null;
  }
}

/**
 * Load conversation history for context
 */
async function loadConversationHistory(phone: string, limit: number = 10): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('sender, message_text, created_at')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      logger.error('Error loading conversation history', error);
      return [];
    }
    
    // Convert to OpenAI message format and reverse to chronological order
    return data
      .reverse()
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.message_text
      }))
      .slice(0, -1); // Remove the last message (current user message)
  } catch (error) {
    logger.error('Error loading conversation history', error);
    return [];
  }
}

/**
 * Send WhatsApp response back to user
 */
async function sendWhatsAppResponse(phone: string, message: string, conversationId?: string): Promise<void> {
  try {
    // Log outbound message first
    await supabase
      .from('conversation_messages')
      .insert({
        phone_number: phone,
        sender: 'assistant',
        message_text: message,
        conversation_id: conversationId,
        status: 'sent',
        channel: 'whatsapp'
      });
    
    // Send via WhatsApp Business API (using existing function)
    const { error } = await supabase.functions.invoke('whatsapp-unified-handler', {
      body: {
        action: 'send_message',
        to: phone,
        message: message
      }
    });
    
    if (error) {
      logger.error('Error sending WhatsApp response', error);
    } else {
      logger.info('WhatsApp response sent successfully', { 
        phone: phone.slice(-4),
        messageLength: message.length
      });
    }
  } catch (error) {
    logger.error('Error sending WhatsApp response', error);
  }
}

/**
 * Send fallback message when agent fails
 */
async function sendFallbackMessage(phone: string): Promise<void> {
  const fallbackMessage = "I'm experiencing some technical difficulties right now. Please try again in a few moments, or contact our support team if the issue persists.";
  
  try {
    await sendWhatsAppResponse(phone, fallbackMessage);
    logger.info('Fallback message sent', { phone: phone.slice(-4) });
  } catch (error) {
    logger.error('Error sending fallback message', error);
  }
}