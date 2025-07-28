import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIKey = Deno.env.get('OPENAI_API_KEY');

interface IntentResult {
  domain: string;
  intent: string;
  confidence: number;
  slots: Record<string, any>;
}

interface AgentResponse {
  success: boolean;
  response_type: 'template' | 'text' | 'media';
  template_id?: string;
  message?: string;
  media_url?: string;
  template_params?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, phone, context } = await req.json();
    
    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Omni-Agent processing:', { userId, message: message.substring(0, 100) });

    // Step 1: Normalize input
    const normalizedMessage = normalizeMessage(message);
    
    // Step 2: Intent detection
    const intent = await detectIntent(normalizedMessage, userId, context);
    console.log('Intent detected:', intent);
    
    // Step 3: Load user memory
    const memory = await loadUserMemory(userId);
    
    // Step 4: Route to skill handler
    const skillResponse = await routeToSkill(intent, normalizedMessage, userId, memory);
    
    // Step 5: Quality gate
    const qualityChecked = await runQualityGate(skillResponse, intent);
    
    // Step 6: Log execution
    await logExecution(userId, intent, skillResponse, phone);
    
    // Step 7: Return response
    return new Response(
      JSON.stringify({
        success: true,
        intent: intent,
        response: qualityChecked
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Omni-Agent error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizeMessage(message: string): string {
  return message.toLowerCase().trim();
}

async function detectIntent(message: string, userId: string, context?: any): Promise<IntentResult> {
  // Rule-based patterns first
  const ruleBasedIntent = matchIntentRules(message);
  if (ruleBasedIntent) {
    return ruleBasedIntent;
  }
  
  // LLM fallback
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `
You are an intent classifier for easyMO, a WhatsApp service platform in Rwanda.

Available domains and intents:
- payments: get_paid, pay_someone, confirm_paid, history, menu
- moto: driver_create_trip, passenger_create_intent, view_nearby_drivers, view_nearby_passengers, menu
- listings: property_list, property_search, vehicle_list, vehicle_search, menu
- commerce: order_pharmacy, order_hardware, order_bar, see_menu, menu
- data_sync: import_google_places, sync_airbnb, upload_csv
- admin_support: handoff_request, help, feedback_submit, menu

User message: "${message}"

Respond with JSON only:
{
  "domain": "domain_name",
  "intent": "intent_name", 
  "confidence": 0.0-1.0,
  "slots": {}
}`
        }],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    return {
      domain: result.domain || 'admin_support',
      intent: result.intent || 'help',
      confidence: result.confidence || 0.5,
      slots: result.slots || {}
    };
    
  } catch (error) {
    console.error('Intent detection fallback failed:', error);
    return {
      domain: 'admin_support',
      intent: 'help',
      confidence: 0.1,
      slots: {}
    };
  }
}

function matchIntentRules(message: string): IntentResult | null {
  const rules = [
    // Payments
    { pattern: /(?:get paid|receive money|qr.*pay)/i, domain: 'payments', intent: 'get_paid' },
    { pattern: /(?:pay someone|send money|transfer)/i, domain: 'payments', intent: 'pay_someone' },
    { pattern: /(?:payment.*history|transaction.*history)/i, domain: 'payments', intent: 'history' },
    
    // Transport
    { pattern: /(?:driver.*on|start.*driving|go.*online)/i, domain: 'moto', intent: 'driver_create_trip' },
    { pattern: /(?:need.*ride|book.*trip|find.*driver)/i, domain: 'moto', intent: 'passenger_create_intent' },
    
    // Listings
    { pattern: /(?:rent.*house|property.*rent|apartment)/i, domain: 'listings', intent: 'property_search' },
    { pattern: /(?:sell.*car|vehicle.*sale|motorbike)/i, domain: 'listings', intent: 'vehicle_search' },
    
    // Commerce
    { pattern: /(?:pharmacy|medicine|drugs)/i, domain: 'commerce', intent: 'order_pharmacy' },
    { pattern: /(?:hardware|tools|construction)/i, domain: 'commerce', intent: 'order_hardware' },
    { pattern: /(?:bar|drink|beer|restaurant)/i, domain: 'commerce', intent: 'order_bar' },
    
    // Support
    { pattern: /(?:help|support|problem|human)/i, domain: 'admin_support', intent: 'help' }
  ];

  for (const rule of rules) {
    if (rule.pattern.test(message)) {
      return {
        domain: rule.domain,
        intent: rule.intent,
        confidence: 0.9,
        slots: {}
      };
    }
  }
  
  return null;
}

async function loadUserMemory(userId: string): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('agent_memory')
      .select('memory_type, memory_value')
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading user memory:', error);
      return {};
    }

    const memory: Record<string, any> = {};
    data?.forEach(item => {
      memory[item.memory_type] = item.memory_value;
    });

    return memory;
  } catch (error) {
    console.error('Memory loading failed:', error);
    return {};
  }
}

async function routeToSkill(intent: IntentResult, message: string, userId: string, memory: Record<string, any>): Promise<AgentResponse> {
  try {
    switch (intent.domain) {
      case 'payments':
        return await handlePaymentsSkill(intent.intent, message, userId, intent.slots);
      case 'moto':
        return await handleMotoSkill(intent.intent, message, userId, intent.slots);
      case 'listings':
        return await handleListingsSkill(intent.intent, message, userId, intent.slots);
      case 'commerce':
        return await handleCommerceSkill(intent.intent, message, userId, intent.slots);
      case 'admin_support':
        return await handleSupportSkill(intent.intent, message, userId, intent.slots);
      default:
        return {
          success: true,
          response_type: 'text',
          message: '👋 Welcome to easyMO! How can I help you today?\n\n💰 Payments\n🏍️ Transport\n🏠 Listings\n🛒 Shopping\n❓ Support'
        };
    }
  } catch (error) {
    console.error('Skill routing error:', error);
    return {
      success: false,
      response_type: 'text',
      message: '❌ Sorry, I encountered an error. Please try again.'
    };
  }
}

async function handlePaymentsSkill(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<AgentResponse> {
  switch (intent) {
    case 'get_paid':
      const amount = extractAmount(message);
      if (!amount) {
        return {
          success: true,
          response_type: 'text',
          message: '💰 To generate a payment QR code, please tell me the amount.\n\nExample: "Get paid 5000 RWF"'
        };
      }
      
      // Call QR generation tool
      try {
        const qrResponse = await supabase.functions.invoke('enhanced-qr-generator', {
          body: { phone: userId, amount: amount, description: 'Payment via easyMO' }
        });
        
        if (qrResponse.data?.qr_url) {
          return {
            success: true,
            response_type: 'media',
            media_url: qrResponse.data.qr_url,
            message: `🎯 Your payment QR is ready!\n\n💰 Amount: ${amount} RWF\n📱 Show this to the payer\n\n⚡ Payment will be instant!`
          };
        }
      } catch (error) {
        console.error('QR generation error:', error);
      }
      
      return {
        success: false,
        response_type: 'text',
        message: '❌ Sorry, I couldn\'t generate your QR code. Please try again.'
      };
      
    case 'menu':
    default:
      return {
        success: true,
        response_type: 'text',
        message: '💰 easyMO Payments\n\nHow can I help you today?\n\n📱 Get Paid - Generate QR code\n💸 Pay Someone - Send money\n📋 History - View transactions\n\nJust tell me what you need!'
      };
  }
}

async function handleMotoSkill(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<AgentResponse> {
  return {
    success: true,
    response_type: 'text',
    message: '🏍️ Moto service coming soon! We\'re working on connecting drivers and passengers.'
  };
}

async function handleListingsSkill(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<AgentResponse> {
  return {
    success: true,
    response_type: 'text',
    message: '🏠 Listings service coming soon! Soon you\'ll be able to find properties and vehicles.'
  };
}

async function handleCommerceSkill(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<AgentResponse> {
  return {
    success: true,
    response_type: 'text',
    message: '🛒 Shopping service coming soon! We\'re connecting you with pharmacies, hardware stores, and restaurants.'
  };
}

async function handleSupportSkill(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<AgentResponse> {
  return {
    success: true,
    response_type: 'text',
    message: '❓ easyMO Support\n\nI\'m here to help! You can:\n\n💰 Get payment QR codes\n💸 Send money\n🏍️ Book rides (coming soon)\n🏠 Find properties (coming soon)\n\nWhat would you like to do?'
  };
}

function extractAmount(message: string): number | null {
  const patterns = [
    /(\d{1,3}(?:,\d{3})*)\s*(?:rwf|frw|francs?)/i,
    /(?:rwf|frw|francs?)\s*(\d{1,3}(?:,\d{3})*)/i,
    /(\d{1,3}(?:,\d{3})*)/
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ''));
      if (amount > 0 && amount <= 1000000) {
        return amount;
      }
    }
  }
  
  return null;
}

async function runQualityGate(response: AgentResponse, intent: IntentResult): Promise<AgentResponse> {
  // Basic quality checks
  if (!response.message && !response.template_id) {
    return {
      success: false,
      response_type: 'text',
      message: '❌ Sorry, I couldn\'t process your request properly. Please try again.'
    };
  }
  
  return response;
}

async function logExecution(userId: string, intent: IntentResult, response: AgentResponse, phone?: string): Promise<void> {
  try {
    await supabase
      .from('agent_execution_log')
      .insert({
        user_id: userId,
        function_name: 'omni-agent-router',
        input_data: { intent, phone },
        success_status: response.success,
        execution_time_ms: 0, // Would track actual time
        model_used: 'omni-agent-v1'
      });
  } catch (error) {
    console.error('Failed to log execution:', error);
  }
}