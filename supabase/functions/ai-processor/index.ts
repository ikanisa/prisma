import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateRequiredEnvVars } from "../_shared/cors.ts";

// CRITICAL SECURITY FIX: Validate environment variables at startup
validateRequiredEnvVars([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { message, processingStartTime } = await req.json();
    console.log(`🤖 AI processor received message from ${message.sender}`);

    // Get or create conversation
    const conversation = await getOrCreateConversation(supabase, message);
    
    // Build user context and memory
    const context = await buildUserContext(supabase, message.sender);
    
    // Generate AI response using MCP orchestrator
    const aiResponse = await generateAIResponse(supabase, message.content, context);
    
    // Send response via channel gateway
    await sendResponse(supabase, message, aiResponse);
    
    // Update memory and conversation tracking
    await updateUserMemory(supabase, message.sender, message.content, aiResponse);
    await logConversationMessages(supabase, conversation.id, message, aiResponse);
    
    // Mark message as processed
    await markMessageProcessed(supabase, message.messageId);

    const processingTime = Date.now() - processingStartTime;
    console.log(`✅ AI processing completed in ${processingTime}ms`);

    return new Response(JSON.stringify({ 
      success: true,
      processingTime,
      conversationId: conversation.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ AI processor error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getOrCreateConversation(supabase: any, message: any) {
  try {
    // Look for active conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', message.sender)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Create new conversation if none exists or last one is old (>24h)
    if (!conversation || isConversationOld(conversation.started_at)) {
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert([{
          contact_id: message.sender,
          channel: message.platform,
          started_at: new Date().toISOString(),
          status: 'active',
          message_count: 0
        }])
        .select()
        .single();

      if (error) throw error;
      conversation = newConversation;
    }

    return conversation;
  } catch (error) {
    console.error('Failed to get/create conversation:', error);
    // Return a minimal conversation object if database fails
    return {
      id: 'temp-' + Date.now(),
      contact_id: message.sender,
      channel: message.platform
    };
  }
}

function isConversationOld(startedAt: string): boolean {
  const conversationStart = new Date(startedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - conversationStart.getTime()) / (1000 * 60 * 60);
  return hoursDiff > 24; // Consider conversation old after 24 hours
}

async function buildUserContext(supabase: any, userId: string) {
  try {
    // Get user memory
    const { data: memory } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    // Get recent messages from this user
    const { data: recentMessages } = await supabase
      .from('message_logs')
      .select('*')
      .eq('sender_id', userId)
      .order('timestamp', { ascending: false })
      .limit(5);

    // Get contact info
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', userId)
      .maybeSingle();

    return {
      memory: memory || [],
      recentMessages: recentMessages || [],
      contact: contact,
      userType: memory?.find(m => m.memory_type === 'user_type')?.memory_value || 'unknown',
      conversationCount: parseInt(memory?.find(m => m.memory_type === 'conversation_count')?.memory_value || '0'),
      lastInteraction: memory?.find(m => m.memory_type === 'last_interaction')?.memory_value
    };
  } catch (error) {
    console.error('Failed to build user context:', error);
    return {
      memory: [],
      recentMessages: [],
      contact: null,
      userType: 'unknown',
      conversationCount: 0,
      lastInteraction: null
    };
  }
}

async function generateAIResponse(supabase: any, content: string, context: any): Promise<string> {
  try {
    // Use MCP orchestrator for intelligent model routing
    const { data, error } = await supabase.functions.invoke('mcp-orchestrator', {
      body: {
        task: 'sales_conversation',
        prompt: content,
        context: {
          userType: context.userType,
          conversationCount: context.conversationCount,
          recentMessages: context.recentMessages.slice(0, 3), // Last 3 messages for context
          contactInfo: context.contact
        }
      }
    });

    if (error) {
      console.error('MCP orchestrator error:', error);
      // Fallback to direct OpenAI call
      return await fallbackOpenAIResponse(content, context);
    }

    return data?.response || await fallbackOpenAIResponse(content, context);
  } catch (error) {
    console.error('AI response generation failed:', error);
    return await fallbackOpenAIResponse(content, context);
  }
}

async function fallbackOpenAIResponse(content: string, context: any): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not configured in fallback function');
    return "Hi! I'm Aline from easyMO. How can I help you with mobile money payments today?";
  }

  const systemPrompt = `You are Aline Ishimwe, easyMO's friendly Rwandan sales agent. You help vendors accept MoMo payments via QR codes.

CRITICAL INSTRUCTIONS:
- Keep responses SHORT (1-2 sentences max)
- Be natural and conversational in English
- Always reference https://easy.ikanisa.com/ as the ONLY correct easyMO website
- Remember context and build on previous conversations

USER CONTEXT:
- User Type: ${context.userType}
- Conversation Count: ${context.conversationCount}
- Contact Info: ${context.contact?.name || 'Unknown'}

Key easyMO benefits:
- No app download needed - works in any browser
- Works offline after first load
- 100% free to use
- Perfect for moto drivers, bars, restaurants, vendors
- Instant QR code generation for MoMo payments`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Hi! I'm Aline from easyMO. How can I help you today?";
  } catch (error) {
    console.error('OpenAI fallback failed:', error);
    return "Hi! I'm Aline from easyMO. How can I help you with mobile money payments today?";
  }
}

async function sendResponse(supabase: any, message: any, responseText: string) {
  try {
    const { error } = await supabase.functions.invoke('channel-gateway', {
      body: {
        channel: message.platform,
        recipient: message.sender,
        message: responseText,
        message_type: 'text'
      }
    });

    if (error) {
      console.error('Failed to send response:', error);
    } else {
      console.log(`📤 Response sent via ${message.platform}`);
    }
  } catch (error) {
    console.error('Failed to send response:', error);
  }
}

async function updateUserMemory(supabase: any, userId: string, userMessage: string, aiResponse: string) {
  try {
    const updates = [];
    const lowerMessage = userMessage.toLowerCase();

    // Detect user type from message content
    if (lowerMessage.includes('moto') || lowerMessage.includes('driver') || lowerMessage.includes('boda')) {
      updates.push({
        user_id: userId,
        memory_type: 'user_type',
        memory_value: 'moto_driver'
      });
    } else if (lowerMessage.includes('bar') || lowerMessage.includes('restaurant') || lowerMessage.includes('hotel')) {
      updates.push({
        user_id: userId,
        memory_type: 'user_type',
        memory_value: 'hospitality_worker'
      });
    } else if (lowerMessage.includes('shop') || lowerMessage.includes('store') || lowerMessage.includes('vendor')) {
      updates.push({
        user_id: userId,
        memory_type: 'user_type',
        memory_value: 'vendor'
      });
    }

    // Update conversation count
    const { data: currentCount } = await supabase
      .from('agent_memory')
      .select('memory_value')
      .eq('user_id', userId)
      .eq('memory_type', 'conversation_count')
      .maybeSingle();

    updates.push({
      user_id: userId,
      memory_type: 'conversation_count',
      memory_value: ((parseInt(currentCount?.memory_value || '0') + 1).toString())
    });

    // Update last interaction
    updates.push({
      user_id: userId,
      memory_type: 'last_interaction',
      memory_value: new Date().toISOString()
    });

    // Use memory consolidator for sophisticated memory management
    if (updates.length > 0) {
      await supabase.functions.invoke('memory-consolidator', {
        body: {
          operation: 'batch_update',
          userId: userId,
          memories: updates
        }
      });
    }
  } catch (error) {
    console.error('Failed to update user memory:', error);
  }
}

async function logConversationMessages(supabase: any, conversationId: string, message: any, aiResponse: string) {
  try {
    const messages = [
      {
        phone_number: message.sender,
        channel: message.platform,
        sender: 'user',
        message_text: message.content,
        created_at: new Date().toISOString()
      },
      {
        phone_number: message.sender,
        channel: message.platform,
        sender: 'agent',
        message_text: aiResponse,
        model_used: 'gpt-4o-mini',
        created_at: new Date().toISOString()
      }
    ];

    await supabase
      .from('conversation_messages')
      .insert(messages);

    console.log(`✅ Conversation messages logged for ${conversationId}`);
  } catch (error) {
    console.error('Failed to log conversation messages:', error);
  }
}

async function markMessageProcessed(supabase: any, messageId: string) {
  try {
    await supabase
      .from('message_logs')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('message_id', messageId);
  } catch (error) {
    console.error('Failed to mark message as processed:', error);
  }
}