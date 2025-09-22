import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
// ============================================================================
// Omni-Agent Core - Self-Learning Autonomous AI System
// Main entry point for all WhatsApp interactions
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const VERIFY_TOKEN = Deno.env.get('META_WABA_VERIFY_TOKEN');
const ACCESS_TOKEN = Deno.env.get('META_WABA_TOKEN');
const PHONE_NUMBER_ID = Deno.env.get('META_WABA_PHONE_ID');

// ============================================================================
// 10-Step Runtime Loop Implementation
// ============================================================================

interface OmniContext {
  userId: string;
  message: string;
  language: string;
  currentStage: string;
  conversationHistory: any[];
  userProfile: any;
  executionLog: any[];
}

interface IntentResult {
  intent: string;
  confidence: number;
  slots: Record<string, any>;
  domain: string;
}

interface QualityResult {
  score: number;
  needsPatch: boolean;
  patchedResponse?: string;
  reason?: string;
}

// Step 1: Webhook Handler (Entry Point)
serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const startTime = Date.now();
    const body = await req.json();
    
    // Extract message from WhatsApp webhook
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    
    if (!message) {
      return new Response('No message found', { status: 200 });
    }

    const userId = message.from;
    const messageText = message.text?.body || '';
    const messageId = message.id;

    console.log(`📥 Processing message from ${userId}: ${messageText}`);

    // Initialize context
    const context: OmniContext = {
      userId,
      message: messageText,
      language: 'en',
      currentStage: 'initial',
      conversationHistory: [],
      userProfile: {},
      executionLog: []
    };

    // Execute the 10-step runtime loop
    const result = await executeRuntimeLoop(context, startTime);
    
    console.log(`✅ Message processed in ${Date.now() - startTime}ms`);
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in omni-agent-core:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// Main Runtime Loop (10 Steps)
// ============================================================================

async function executeRuntimeLoop(context: OmniContext, startTime: number): Promise<any> {
  const steps = [
    'webhook_handler',
    'conversation_state_manager', 
    'language_detector',
    'detectIntentAndSlots',
    'router',
    'openai_assistant',
    'quality_gate',
    'channel_gateway',
    'memory_consolidator',
    'performance_monitor'
  ];

  for (let i = 0; i < steps.length; i++) {
    const stepStart = Date.now();
    const step = steps[i];
    
    try {
      console.log(`🔄 Step ${i+1}/10: ${step}`);
      
      switch (step) {
        case 'conversation_state_manager':
          await stepGetState(context);
          break;
        case 'language_detector':
          await stepDetectLanguage(context);
          break;
        case 'detectIntentAndSlots':
          await stepDetectIntent(context);
          break;
        case 'router':
          await stepRouter(context);
          break;
        case 'openai_assistant':
          await stepOpenAIAssistant(context);
          break;
        case 'quality_gate':
          await stepQualityGate(context);
          break;
        case 'channel_gateway':
          await stepChannelGateway(context);
          break;
        case 'memory_consolidator':
          await stepMemoryConsolidator(context);
          break;
        case 'performance_monitor':
          await stepPerformanceMonitor(context, startTime);
          break;
      }

      const stepTime = Date.now() - stepStart;
      context.executionLog.push({
        step,
        latency_ms: stepTime,
        success: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Error in step ${step}:`, error);
      context.executionLog.push({
        step,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      });
      
      // For critical errors, trigger handoff
      if (['openai_assistant', 'channel_gateway'].includes(step)) {
        await triggerHandoff(context, `Step ${step} failed: ${error.message}`);
      }
    }
  }

  return { executionLog: context.executionLog };
}

// ============================================================================
// Step Implementations
// ============================================================================

// Step 2: Conversation State Manager
async function stepGetState(context: OmniContext) {
  const { data: state } = await supabase
    .from('conversation_state')
    .select('*')
    .eq('user_id', context.userId)
    .single();

  if (state) {
    context.currentStage = state.current_stage;
    Object.assign(context, state.context_data || {});
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', context.userId)
    .single();

  if (profile) {
    context.userProfile = profile;
    context.language = profile.language || 'en';
  }

  // Get recent conversation history
  const { data: messages } = await supabase
    .from('agent_conversations')
    .select('*')
    .eq('user_id', context.userId)
    .order('ts', { ascending: false })
    .limit(10);

  context.conversationHistory = messages || [];
}

// Step 3: Language Detector
async function stepDetectLanguage(context: OmniContext) {
  if (context.message.length < 10) return; // Skip for short messages

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'Detect the language of this text. Respond with just the 2-letter code: en, rw, fr, or sw'
      }, {
        role: 'user',
        content: context.message
      }],
      temperature: 0.1
    }),
  });

  const data = await response.json();
  const detectedLang = data.choices[0].message.content.toLowerCase().trim();
  
  if (['en', 'rw', 'fr', 'sw'].includes(detectedLang)) {
    context.language = detectedLang;
    
    // Update user profile if changed
    if (context.userProfile.language !== detectedLang) {
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: context.userId,
          language: detectedLang,
          updated_at: new Date().toISOString()
        });
    }
  }
}

// Step 4: Intent and Slot Detection
async function stepDetectIntent(context: OmniContext): Promise<IntentResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are an intent classifier for Rwanda's mobile money and transport app. 
        Analyze the user message and return JSON with:
        - intent: main action (pay_money, request_ride, find_business, list_property, etc.)
        - confidence: 0.0-1.0
        - slots: extracted entities (amount, location, etc.)
        - domain: payments, mobility, commerce, listings, or general`
      }, {
        role: 'user',
        content: `Context: ${JSON.stringify(context.userProfile)}
        Current stage: ${context.currentStage}
        Message: ${context.message}`
      }],
      temperature: 0.2
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  
  // Store in context
  Object.assign(context, { 
    intent: result.intent,
    confidence: result.confidence,
    slots: result.slots,
    domain: result.domain
  });

  return result;
}

// Step 5: Router
async function stepRouter(context: OmniContext) {
  // Simple routing logic based on domain and confidence
  if (context.confidence < 0.4) {
    context.routeAction = 'clarify';
  } else if (context.domain === 'payments') {
    context.routeAction = 'payment_handler';
  } else if (context.domain === 'mobility') {
    context.routeAction = 'mobility_handler';
  } else {
    context.routeAction = 'general_assistant';
  }
}

// Step 6: OpenAI Assistant
async function stepOpenAIAssistant(context: OmniContext) {
  // This would integrate with OpenAI Assistant API
  // For now, generating a simple response based on intent
  
  let response = "I understand you want help with " + context.intent;
  
  if (context.domain === 'payments' && context.slots?.amount) {
    response = `I can help you with a payment of ${context.slots.amount} RWF. Would you like to generate a QR code?`;
  } else if (context.domain === 'mobility') {
    response = "I can help you find a ride or driver. Could you share your location?";
  }

  context.assistantResponse = response;
}

// Step 7: Quality Gate
async function stepQualityGate(context: OmniContext) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `Rate this response quality (0.0-1.0) for clarity, helpfulness, and appropriateness for Rwanda mobile money context. Return JSON with score and reason.`
      }, {
        role: 'user',
        content: `Original message: ${context.message}
        Response: ${context.assistantResponse}`
      }],
      temperature: 0.1
    }),
  });

  const data = await response.json();
  const quality = JSON.parse(data.choices[0].message.content);
  
  if (quality.score < 0.6) {
    // Log for learning
    await supabase.from('quality_feedback').insert({
      user_id: context.userId,
      original_response: context.assistantResponse,
      quality_score: quality.score,
      patch_reason: quality.reason
    });
    
    // Could implement patching here
  }
}

// Step 8: Channel Gateway
async function stepChannelGateway(context: OmniContext) {
  const payload = {
    messaging_product: "whatsapp",
    to: context.userId,
    type: "text",
    text: {
      body: context.assistantResponse
    }
  };

  const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${response.statusText}`);
  }
}

// Step 9: Memory Consolidator
async function stepMemoryConsolidator(context: OmniContext) {
  // Log the conversation
  await supabase.from('agent_conversations').insert({
    user_id: context.userId,
    role: 'user',
    message: context.message,
    metadata: { intent: context.intent, confidence: context.confidence }
  });

  await supabase.from('agent_conversations').insert({
    user_id: context.userId,
    role: 'agent',
    message: context.assistantResponse,
    metadata: { domain: context.domain, route: context.routeAction }
  });

  // Update conversation state
  await supabase.from('conversation_state').upsert({
    user_id: context.userId,
    current_stage: context.currentStage,
    last_intent: context.intent,
    confidence: context.confidence,
    context_data: {
      domain: context.domain,
      slots: context.slots
    }
  });
}

// Step 10: Performance Monitor
async function stepPerformanceMonitor(context: OmniContext, startTime: number) {
  const totalTime = Date.now() - startTime;
  
  await supabase.from('agent_execution_log').insert({
    user_id: context.userId,
    function_name: 'omni-agent-core',
    execution_time_ms: totalTime,
    success_status: true,
    input_data: {
      message: context.message,
      intent: context.intent,
      confidence: context.confidence
    }
  });

  // Log system metrics
  await supabase.from('system_metrics').insert({
    metric_name: 'response_time_ms',
    metric_value: totalTime,
    metric_type: 'performance',
    tags: { domain: context.domain, intent: context.intent }
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

async function triggerHandoff(context: OmniContext, reason: string) {
  await supabase.from('live_handoffs').insert({
    user_id: context.userId,
    reason,
    context_data: {
      message: context.message,
      stage: context.currentStage,
      intent: context.intent
    }
  });

  // Send handoff message
  const payload = {
    messaging_product: "whatsapp",
    to: context.userId,
    type: "text",
    text: {
      body: "I'm connecting you with a human agent who can better assist you. Please wait a moment."
    }
  };

  await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}