import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingRequest {
  from: string;
  text: string;
  message_id?: string;
  contact_name?: string;
  timestamp?: string;
}

interface AgentConfig {
  code: string;
  name: string;
  system_prompt: string;
  temperature: number;
  tools_json: any[];
  active: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const request: ProcessingRequest = await req.json();
    console.log(`🤖 Unified AI Orchestrator processing: "${request.text}" from ${request.from}`);

    // 1. Get active agent configuration
    const { data: agentConfigs, error: configError } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('active', true)
      .eq('code', 'easymo_main')
      .single();

    if (configError || !agentConfigs) {
      throw new Error('No active agent configuration found');
    }

    // 2. Build user context
    const userContext = await buildUserContext(supabase, request.from);

    // 3. Process with AI using latest model
    const aiResponse = await processWithAI(agentConfigs, request.text, userContext);

    // 4. Send response via WhatsApp
    await sendWhatsAppResponse(request.from, aiResponse);

    // 5. Log conversation
    await logConversation(supabase, request.from, request.text, aiResponse);

    // 6. Update user memory
    await updateUserMemory(supabase, request.from, request.text, aiResponse);

    // 7. Mark message as processed
    if (request.message_id) {
      await supabase
        .from('incoming_messages')
        .update({ processed: true })
        .eq('id', request.message_id);
    }

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Unified AI Orchestrator error:', error);
    
    // Send fallback response
    const fallbackMessage = "Muraho! I'm having technical difficulties right now. Please try again in a moment or type 'help' for assistance. 🤖";
    
    try {
      const request: ProcessingRequest = await req.json();
      await sendWhatsAppResponse(request.from, fallbackMessage);
    } catch (e) {
      console.error('Failed to send fallback response:', e);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      fallback_sent: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function buildUserContext(supabase: any, phoneNumber: string) {
  try {
    // Get user memory
    const { data: memory } = await supabase
      .from('agent_memory')
      .select('memory_type, memory_value')
      .eq('user_id', phoneNumber);

    // Get recent conversations
    const { data: conversations } = await supabase
      .from('agent_conversations')
      .select('role, message, ts')
      .eq('user_id', phoneNumber)
      .order('ts', { ascending: false })
      .limit(5);

    return {
      memory: Object.fromEntries((memory || []).map((m: any) => [m.memory_type, m.memory_value])),
      recentConversations: conversations || [],
      conversationCount: conversations?.length || 0,
      userType: memory?.find((m: any) => m.memory_type === 'user_type')?.memory_value || 'unknown'
    };
  } catch (error) {
    console.error('Error building user context:', error);
    return { memory: {}, recentConversations: [], conversationCount: 0, userType: 'unknown' };
  }
}

async function processWithAI(agentConfig: AgentConfig, message: string, context: any): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    return "I'm not fully configured right now. Please contact support for assistance.";
  }

  try {
    // Build conversation history
    const messages = [
      {
        role: 'system',
        content: agentConfig.system_prompt
      },
      // Add recent conversation context
      ...context.recentConversations.slice(0, 3).reverse().map((conv: any) => ({
        role: conv.role === 'user' ? 'user' : 'assistant',
        content: conv.message
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Use the latest, most reliable model
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Latest model
        messages,
        temperature: agentConfig.temperature,
        max_tokens: 300,
        tools: agentConfig.tools_json.length > 0 ? agentConfig.tools_json : undefined
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return "I'm experiencing high demand right now. Please try again in a moment! 😊";
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || "I apologize, but I couldn't process your request right now.";

  } catch (error) {
    console.error('AI processing error:', error);
    return "I'm having trouble understanding right now. Could you please rephrase your message? 🤔";
  }
}

async function sendWhatsAppResponse(phoneNumber: string, message: string) {
  const whatsappToken = Deno.env.get('META_WABA_TOKEN') || Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const whatsappPhoneId = Deno.env.get('META_WABA_PHONE_ID') || Deno.env.get('WHATSAPP_PHONE_ID');

  if (!whatsappToken || !whatsappPhoneId) {
    console.log('WhatsApp not configured, would send:', message);
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    console.log('✅ WhatsApp message sent successfully');
  } catch (error) {
    console.error('WhatsApp send error:', error);
  }
}

async function logConversation(supabase: any, phoneNumber: string, userMessage: string, aiResponse: string) {
  try {
    // Log user message
    await supabase.from('agent_conversations').insert({
      user_id: phoneNumber,
      role: 'user',
      message: userMessage,
      ts: new Date().toISOString()
    });

    // Log AI response
    await supabase.from('agent_conversations').insert({
      user_id: phoneNumber,
      role: 'assistant',
      message: aiResponse,
      ts: new Date().toISOString()
    });

    // Also log in conversation_messages for compatibility
    await supabase.from('conversation_messages').insert([
      {
        phone_number: phoneNumber,
        sender: 'user',
        message_text: userMessage,
        channel: 'whatsapp'
      },
      {
        phone_number: phoneNumber,
        sender: 'assistant',
        message_text: aiResponse,
        channel: 'whatsapp',
        model_used: 'gpt-4.1-2025-04-14'
      }
    ]);
  } catch (error) {
    console.error('Conversation logging error:', error);
  }
}

async function updateUserMemory(supabase: any, phoneNumber: string, userMessage: string, aiResponse: string) {
  try {
    // Update last interaction
    await supabase.from('agent_memory').upsert({
      user_id: phoneNumber,
      memory_type: 'last_interaction',
      memory_value: new Date().toISOString()
    }, { onConflict: 'user_id,memory_type' });

    // Update conversation count
    const { data: conversations } = await supabase
      .from('agent_conversations')
      .select('id', { count: 'exact' })
      .eq('user_id', phoneNumber);

    await supabase.from('agent_memory').upsert({
      user_id: phoneNumber,
      memory_type: 'conversation_count',
      memory_value: (conversations?.length || 0).toString()
    }, { onConflict: 'user_id,memory_type' });

    // Detect and store user type based on message patterns
    const userType = detectUserType(userMessage);
    if (userType !== 'unknown') {
      await supabase.from('agent_memory').upsert({
        user_id: phoneNumber,
        memory_type: 'user_type',
        memory_value: userType
      }, { onConflict: 'user_id,memory_type' });
    }
  } catch (error) {
    console.error('Memory update error:', error);
  }
}

function detectUserType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('driver') || lowerMessage.includes('trip') || lowerMessage.includes('moto')) {
    return 'driver';
  }
  
  if (lowerMessage.includes('ride') || lowerMessage.includes('need transport') || lowerMessage.includes('passenger')) {
    return 'passenger';
  }
  
  if (lowerMessage.includes('sell') || lowerMessage.includes('harvest') || lowerMessage.includes('produce') || lowerMessage.includes('farmer')) {
    return 'farmer';
  }
  
  if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('shopping')) {
    return 'shopper';
  }
  
  return 'unknown';
}