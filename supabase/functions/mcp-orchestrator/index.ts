import { supabaseClient } from "./client.ts";

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse, analyzeIntent } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { 
      from, 
      text, 
      message_id, 
      contact_name, 
      timestamp,
      task,
      prompt,
      context,
      userMessage,
      phone_number,
      language 
    } = body;

    const executionStart = Date.now();
    const userPhone = from || phone_number;
    const userText = text || prompt || userMessage;

    console.log(`🧠 MCP Orchestrator processing: "${userText}" from ${userPhone}`);

    // Get user context and memory
    const userContext = await buildUserContext(supabase, userPhone);
    
    // Determine the best AI model and approach
    const orchestrationResult = await orchestrateResponse(userText, userContext, context);
    
    // Execute the determined action
    let response;
    if (orchestrationResult.shouldRoute) {
      // Route to specialized function
      response = await routeToSpecializedFunction(supabase, orchestrationResult.targetFunction, {
        from: userPhone,
        text: userText,
        message_id,
        contact_name,
        timestamp
      });
    } else {
      // Generate direct AI response
      response = await generateAIResponse(userText, userContext, orchestrationResult.selectedModel);
    }

    // Send WhatsApp response if phone provided
    if (userPhone && (from || phone_number)) {
      await sendWhatsAppMessage(userPhone, response.message);
    }

    // Log conversation and update memory
    if (userPhone) {
      await logConversation(supabase, userPhone, userText, response.message);
      await updateUserMemory(supabase, userPhone, userText, response, orchestrationResult);
    }

    // Log execution
    const executionTime = Date.now() - executionStart;
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'mcp-orchestrator',
        user_id: userPhone || 'unknown',
        input_data: { text: userText, task, context },
        execution_time_ms: executionTime,
        success_status: true,
        model_used: orchestrationResult.selectedModel,
        timestamp: new Date().toISOString()
      });

    return new Response(JSON.stringify({ 
      handled: true,
      reply: response.message,
      response: response.message,
      action: response.action,
      data: response.data,
      model_used: orchestrationResult.selectedModel,
      routed_to: orchestrationResult.targetFunction
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('MCP Orchestrator error:', error);
    
    // Log failed execution
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const body = await req.json();
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'mcp-orchestrator',
        user_id: body.from || body.phone_number || 'unknown',
        input_data: body,
        execution_time_ms: 0,
        success_status: false,
        error_details: error.message,
        timestamp: new Date().toISOString()
      });

    return new Response(JSON.stringify({ 
      handled: false, 
      error: error.message,
      reply: "I'm having technical difficulties. Please try again or contact support."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function buildUserContext(supabase: any, phone: string) {
  // Get user memory
  const { data: memory } = await supabase
    .from('agent_memory')
    .select('memory_type, memory_value')
    .eq('user_id', phone);

  const memoryObj = Object.fromEntries((memory || []).map((m: any) => [m.memory_type, m.memory_value]));

  // Get recent conversations
  const { data: conversations } = await supabase
    .from('agent_conversations')
    .select('role, message, ts')
    .eq('user_id', phone)
    .order('ts', { ascending: false })
    .limit(10);

  // Get contact info - use maybeSingle to avoid errors when no contact exists
  const { data: contact } = await supabase
    .from('wa_contacts')
    .select('*')
    .eq('wa_id', phone)
    .maybeSingle();

  return {
    memory: memoryObj,
    recentConversations: conversations || [],
    contact: contact || null,
    userType: memoryObj.user_type || 'unknown',
    conversationCount: conversations?.length || 0
  };
}

async function orchestrateResponse(text: string, context: any, additionalContext?: any) {
  const lowerText = text.toLowerCase();
  
  // Smart routing logic
  const routingRules = [
    {
      keywords: ['trip', 'ride', 'moto', 'driver', 'tugende', 'gutwara'],
      function: 'driver-trip-create',
      confidence: 0.8
    },
    {
      keywords: ['need ride', 'passenger', 'nkeneye', 'looking for'],
      function: 'passenger-intent-create',
      confidence: 0.8
    },
    {
      keywords: ['house', 'plot', 'rent', 'property', 'real estate'],
      function: 'property-listing-manager',
      confidence: 0.8
    },
    {
      keywords: ['car', 'vehicle', 'toyota', 'moto for sale'],
      function: 'vehicle-listing-create',
      confidence: 0.8
    },
    {
      keywords: ['maize', 'beans', 'produce', 'kg', 'harvest'],
      function: 'farmer-produce-create',
      confidence: 0.8
    },
    {
      keywords: ['order', 'bar', 'pharmacy', 'shop'],
      function: 'business-order-create',
      confidence: 0.7
    },
    {
      keywords: ['help', 'support', 'problem', 'issue', 'complaint'],
      function: 'support-ticket',
      confidence: 0.9
    }
  ];

  // Check for routing matches
  let bestMatch = null;
  let highestConfidence = 0;

  for (const rule of routingRules) {
    const matchCount = rule.keywords.filter(keyword => lowerText.includes(keyword)).length;
    const confidence = (matchCount / rule.keywords.length) * rule.confidence;
    
    if (confidence > highestConfidence && confidence > 0.5) {
      highestConfidence = confidence;
      bestMatch = rule;
    }
  }

  // Consider user context for routing
  if (context.userType && !bestMatch) {
    switch (context.userType) {
      case 'driver':
        bestMatch = { function: 'driver-trip-create', confidence: 0.6 };
        break;
      case 'passenger':
        bestMatch = { function: 'passenger-intent-create', confidence: 0.6 };
        break;
      case 'farmer':
        bestMatch = { function: 'farmer-produce-create', confidence: 0.6 };
        break;
    }
  }

  // Determine model selection
  let selectedModel = 'gpt-4o-mini'; // Default fast model
  
  // Use more powerful model for complex queries
  if (text.length > 200 || 
      lowerText.includes('complex') || 
      lowerText.includes('explain') ||
      lowerText.includes('analyze') ||
      context.conversationCount > 5) {
    selectedModel = 'gpt-4o';
  }

  return {
    shouldRoute: bestMatch && bestMatch.confidence > 0.7,
    targetFunction: bestMatch?.function,
    confidence: bestMatch?.confidence || 0,
    selectedModel,
    reasoning: bestMatch ? `Matched keywords for ${bestMatch.function}` : 'No strong routing match, using direct AI response'
  };
}

async function routeToSpecializedFunction(supabase: any, functionName: string, payload: any) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });

    if (error) {
      console.error(`Error calling ${functionName}:`, error);
      throw error;
    }

    return {
      message: data?.message || "Request processed successfully",
      action: data?.action,
      data: data
    };
  } catch (error) {
    console.error(`Failed to route to ${functionName}:`, error);
    throw error;
  }
}

async function generateAIResponse(text: string, context: any, model: string = 'gpt-4o-mini') {
  if (!openAIApiKey) {
    return {
      message: "I understand your message. Unfortunately, I'm not fully configured right now. Please contact support for assistance.",
      action: null,
      data: null
    };
  }

  try {
    const systemPrompt = `You are an AI assistant for easyMO, a super-app in Rwanda providing transport, marketplace, and payment services via WhatsApp.

User Context:
- User type: ${context.userType}
- Conversation count: ${context.conversationCount}
- Recent activity: ${context.memory.recent_activity || 'none'}

Guidelines:
- Keep responses under 160 characters when possible
- Be helpful and friendly
- Use simple English or basic Kinyarwanda
- If the user needs specialized help, suggest they use specific keywords like "trip", "house", "car", "produce"
- For payments, mention MoMo integration
- Always try to guide users to relevant services

Available services:
- Transport: Moto rides and trips
- Marketplace: Buy/sell produce, property, vehicles
- Payments: Mobile money integration
- Business: Order from bars, pharmacies, shops`;

    // Use OpenAI SDK with Rwanda-first persona
    const contextMessages = context.recentConversations.slice(0, 5).reverse().map((conv: any) => ({
      role: conv.role === 'user' ? 'user' : 'assistant',
      content: conv.message
    }));
    
    const response = await generateIntelligentResponse(
      text,
      systemPrompt,
      contextMessages.map(c => c.content),
      { 
        model: model as any,
        temperature: 0.7,
        max_tokens: 150
      }
    );
    
    return {
      message: response,
      action: null,
      data: null
    };
  } catch (error) {
    console.error('AI response generation error:', error);
    return {
      message: "I'm having trouble understanding right now. Can you try rephrasing your request?",
      action: null,
      data: null
    };
  }
}

async function logConversation(supabase: any, phone: string, userMessage: string, aiResponse: string) {
  try {
    // Log user message
    await supabase
      .from('agent_conversations')
      .insert({
        user_id: phone,
        role: 'user',
        message: userMessage,
        ts: new Date().toISOString()
      });

    // Log AI response
    await supabase
      .from('agent_conversations')
      .insert({
        user_id: phone,
        role: 'assistant',
        message: aiResponse,
        ts: new Date().toISOString()
      });
  } catch (error) {
    console.error('Conversation logging error:', error);
  }
}

async function updateUserMemory(supabase: any, phone: string, userMessage: string, aiResponse: any, orchestrationResult: any) {
  try {
    // Update last interaction
    await supabase
      .from('agent_memory')
      .upsert({
        user_id: phone,
        memory_type: 'last_interaction',
        memory_value: new Date().toISOString()
      }, { onConflict: 'user_id,memory_type' });

    // Update conversation count
    const { data: convCount } = await supabase
      .from('agent_conversations')
      .select('id', { count: 'exact' })
      .eq('user_id', phone);

    await supabase
      .from('agent_memory')
      .upsert({
        user_id: phone,
        memory_type: 'conversation_count',
        memory_value: (convCount?.length || 0).toString()
      }, { onConflict: 'user_id,memory_type' });

    // Store recent activity based on orchestration result
    if (orchestrationResult.targetFunction) {
      await supabase
        .from('agent_memory')
        .upsert({
          user_id: phone,
          memory_type: 'recent_activity',
          memory_value: orchestrationResult.targetFunction
        }, { onConflict: 'user_id,memory_type' });
    }
  } catch (error) {
    console.error('Memory update error:', error);
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  if (!whatsappToken || !whatsappPhoneNumberId) {
    console.log('WhatsApp not configured, would send:', message);
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
  }
}
