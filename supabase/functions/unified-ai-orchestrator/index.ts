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
      userType: memory?.find((m: any) => m.memory_type === 'user_type')?.memory_value || 'unknown',
      phoneNumber: phoneNumber  // Add phoneNumber to context
    };
  } catch (error) {
    console.error('Error building user context:', error);
    return { 
      memory: {}, 
      recentConversations: [], 
      conversationCount: 0, 
      userType: 'unknown',
      phoneNumber: phoneNumber 
    };
  }
}

async function processWithAI(agentConfig: AgentConfig, message: string, context: any): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.error('🔑 OpenAI API key not configured');
    return "Muraho! I'm not fully configured right now. Please contact support for assistance.";
  }

  try {
    // Check for direct action intents and handle them immediately
    const intentResult = classifyIntent(message, context);
    console.log('🎯 Intent classified:', intentResult);

    // Handle direct QR generation for payment amounts
    if (intentResult.domain === 'momo_qr_payments' && intentResult.intent === 'qr_generate_receive' && intentResult.slots.amount) {
      console.log('🔧 Handling QR generation directly');
      return await handleQRGeneration(intentResult.slots.amount, context.phoneNumber);
    }

    // Handle split bill requests  
    if (intentResult.domain === 'momo_qr_payments' && intentResult.intent === 'split_bill' && intentResult.slots.total_amount && intentResult.slots.num_people) {
      console.log('🔧 Handling split bill directly');
      return await handleSplitBill(intentResult.slots.total_amount, intentResult.slots.num_people, context.phoneNumber);
    }

    // Handle fare estimates
    if (intentResult.domain === 'moto_mobility' && intentResult.intent === 'fare_estimate' && intentResult.slots.origin && intentResult.slots.destination) {
      console.log('🔧 Handling fare estimate directly');
      return await handleFareEstimate(intentResult.slots.origin, intentResult.slots.destination);
    }

    // For other intents that need edge functions, route them
    if (intentResult.domain !== 'onboarding' && intentResult.confidence > 0.7) {
      const edgeFunctionResult = await routeToEdgeFunction(intentResult, context);
      if (edgeFunctionResult) {
        return edgeFunctionResult;
      }
    }
    
    // Get agent-specific system prompt
    const agentType = determineAgent(message, context);
    const systemPrompt = getAgentSystemPrompt(agentType, context);
    
    // Build conversation history with intent context
    const messages = [
      {
        role: 'system',
        content: systemPrompt + `\n\nCurrent intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`
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

    console.log('📤 Sending to OpenAI:', { 
      model: 'gpt-4o-mini', 
      messageCount: messages.length,
      temperature: agentConfig.temperature 
    });

    // Use gpt-4o-mini for better rate limits and reliability
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // More reliable model with better rate limits
        messages,
        temperature: agentConfig.temperature || 0.7,
        max_tokens: 300
      }),
    });

    console.log('📥 OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', { status: response.status, error: errorText });
      
      // Handle specific error types with more helpful messages
      if (response.status === 429) {
        return "I'm currently experiencing high usage. Our team has been notified. Please try again in a few minutes, or feel free to ask a simpler question in the meantime.";
      }
      if (response.status === 401) {
        return "There's a temporary configuration issue on our end. Our technical team has been notified and will resolve this shortly.";
      }
      if (response.status === 400) {
        return "I'm having trouble understanding your message. Could you please rephrase it or ask something else?";
      }
      if (response.status >= 500) {
        return "I'm experiencing technical difficulties. Please try again in a moment.";
      }
      
      return "I'm having some technical issues right now. Please try again or contact support if this persists.";
    }

    const data = await response.json();
    console.log('✅ OpenAI response received:', { 
      choices: data.choices?.length,
      usage: data.usage 
    });

    if (!data.choices || data.choices.length === 0) {
      console.error('❌ No choices in OpenAI response:', data);
      return "Muraho! I'm having trouble generating a response right now. Please try again.";
    }

    const aiMessage = data.choices[0].message?.content;
    if (!aiMessage) {
      console.error('❌ No content in OpenAI response');
      return "Muraho! I'm having trouble with my response. Please try again.";
    }

    console.log('🎯 AI Response generated:', { 
      length: aiMessage.length,
      preview: aiMessage.substring(0, 50) + '...'
    });

    return aiMessage;

  } catch (error) {
    console.error('❌ AI processing error:', error);
    return "Muraho! I'm having technical difficulties. Please try again in a moment or type 'help' for assistance.";
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

// Enhanced intent classification based on the comprehensive domain spec
function classifyIntent(message: string, context: any): any {
  const lowerMessage = message.toLowerCase();
  
  // MoMo QR Payments Domain
  // Handle "pay XXXX" pattern for direct QR generation
  const directPayPattern = lowerMessage.match(/^(pay|payment)\s+(\d{3,})/i);
  if (directPayPattern) {
    return {
      domain: 'momo_qr_payments',
      intent: 'qr_generate_receive',
      confidence: 0.95,
      slots: { amount: parseInt(directPayPattern[2]) }
    };
  }

  if (lowerMessage.match(/(qr|get paid|scan and pay me|give me code|send me.*qr)/i)) {
    return {
      domain: 'momo_qr_payments',
      intent: 'qr_generate_receive',
      confidence: 0.9,
      slots: extractAmount(message) ? { amount: extractAmount(message) } : {}
    };
  }
  
  if (lowerMessage.match(/(did they pay|check payment|status|money arrived|received\?)/i)) {
    return {
      domain: 'momo_qr_payments',
      intent: 'payment_status_check',
      confidence: 0.8,
      slots: {}
    };
  }
  
  if (lowerMessage.match(/(how.*pay|scan.*code|where.*amount|pay.*help)/i)) {
    return {
      domain: 'momo_qr_payments',
      intent: 'qr_pay_help',
      confidence: 0.7,
      slots: {}
    };
  }
  
  if (lowerMessage.match(/(wrong amount|sent.*wrong|refund|dispute)/i)) {
    return {
      domain: 'momo_qr_payments',
      intent: 'refund_or_dispute',
      confidence: 0.9,
      slots: {}
    };
  }
  
  if (lowerMessage.match(/(split.*bill|share.*bill|divide.*payment)/i)) {
    return {
      domain: 'momo_qr_payments',
      intent: 'split_bill',
      confidence: 0.8,
      slots: extractSplitBillInfo(message)
    };
  }
  
  // Moto Mobility Domain - Driver Intents
  if (lowerMessage.match(/(i'm going from|leaving.*to|heading to|trip from.*to)/i)) {
    return {
      domain: 'moto_mobility',
      intent: 'driver_trip_create',
      actor: 'driver',
      confidence: 0.9,
      slots: extractTripInfo(message)
    };
  }
  
  if (lowerMessage.match(/(show passengers|anyone going|passengers nearby)/i)) {
    return {
      domain: 'moto_mobility',
      intent: 'driver_view_passengers',
      actor: 'driver',
      confidence: 0.8,
      slots: {}
    };
  }
  
  // Moto Mobility Domain - Passenger Intents
  if (lowerMessage.match(/(need.*moto|ride from|go to|transport.*to|need ride)/i)) {
    return {
      domain: 'moto_mobility',
      intent: 'passenger_intent_create',
      actor: 'passenger',
      confidence: 0.9,
      slots: extractRideRequest(message)
    };
  }
  
  if (lowerMessage.match(/(how much.*from|price.*to|cost.*ride|fare)/i)) {
    return {
      domain: 'moto_mobility',
      intent: 'fare_estimate',
      actor: 'passenger',
      confidence: 0.8,
      slots: extractRouteInfo(message)
    };
  }
  
  // Safety and Support
  if (lowerMessage.match(/(unsafe|stole|harass|driver rude|lost bag|report)/i)) {
    return {
      domain: 'shared',
      intent: 'report_issue_safety',
      confidence: 0.9,
      escalate: true,
      slots: { issue_type: 'safety' }
    };
  }
  
  if (lowerMessage.match(/(talk to human|operator|real person|agent)/i)) {
    return {
      domain: 'shared',
      intent: 'help_human_handoff',
      confidence: 0.9,
      escalate: true,
      slots: {}
    };
  }
  
  // Language switching
  if (lowerMessage.match(/(kinyarwanda|français|swahili|english)/i)) {
    return {
      domain: 'shared',
      intent: 'language_switch',
      confidence: 0.8,
      slots: { language: detectLanguage(message) }
    };
  }
  
  // Default to onboarding for new users or unclear intents
  return {
    domain: 'onboarding',
    intent: 'welcome_guide',
    confidence: 0.5,
    slots: {}
  };
}

// Helper functions for slot extraction
function extractAmount(message: string): number | null {
  const match = message.match(/(\d{3,})\s?(rwf|frw)?/i);
  return match ? parseInt(match[1]) : null;
}

function extractSplitBillInfo(message: string): any {
  const amountMatch = message.match(/(\d{3,})/);
  const peopleMatch = message.match(/(\d+)\s*people/i);
  
  return {
    total_amount: amountMatch ? parseInt(amountMatch[1]) : null,
    num_people: peopleMatch ? parseInt(peopleMatch[1]) : null
  };
}

function extractTripInfo(message: string): any {
  // Extract origin and destination from natural language
  const fromToMatch = message.match(/from\s+([^to]+)\s+to\s+(.+?)(?:\s+at|\s+\d|$)/i);
  if (fromToMatch) {
    return {
      origin: fromToMatch[1].trim(),
      destination: fromToMatch[2].trim()
    };
  }
  return {};
}

function extractRideRequest(message: string): any {
  const fromToMatch = message.match(/from\s+([^to]+)\s+to\s+(.+?)(?:\s+at|\s+\d|$)/i);
  const timeMatch = message.match(/(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  
  const slots: any = {};
  if (fromToMatch) {
    slots.origin = fromToMatch[1].trim();
    slots.destination = fromToMatch[2].trim();
  }
  if (timeMatch) {
    slots.when = timeMatch[1];
  }
  return slots;
}

function extractRouteInfo(message: string): any {
  const fromToMatch = message.match(/from\s+([^to]+)\s+to\s+(.+?)(?:\?|$)/i);
  if (fromToMatch) {
    return {
      origin: fromToMatch[1].trim(),
      destination: fromToMatch[2].trim()
    };
  }
  return {};
}

function detectLanguage(message: string): string {
  if (message.match(/kinyarwanda|kinyrwanda/i)) return 'rw';
  if (message.match(/français|french/i)) return 'fr';
  if (message.match(/swahili/i)) return 'sw';
  return 'en';
}

function determineAgent(message: string, context: any): string {
  // Use intent classification instead of simple keyword matching
  const intentResult = classifyIntent(message, context);
  
  // Handle escalation cases
  if (intentResult.escalate) {
    return 'escalation';
  }
  
  switch (intentResult.domain) {
    case 'momo_qr_payments':
      return 'payment';
    case 'moto_mobility':
      return 'logistics';
    case 'onboarding':
    default:
      return 'onboarding';
  }
}

function getAgentSystemPrompt(agentType: string, context: any): string {
  const baseInfo = `You are an AI assistant for easyMO, Rwanda's WhatsApp super-app for payments and transport.
Always respond in a helpful, conversational manner. Keep responses under 300 characters unless complex information is needed.
Current user type: ${context.userType || 'unknown'}
Conversation count: ${context.conversationCount || 0}`;

  switch (agentType) {
    case 'onboarding':
      return `${baseInfo}

You are the OnboardingAgent. Guide users to the right services with intelligence.

For NEW USERS (conversation count 0-2), show the main service menu:

"Muraho! 👋 Welcome to easyMO!

🎯 Popular Services:
💰 *Pay bills* → Type "pay" + amount
💸 *Get paid* → "QR 5000" for 5k QR
🏍️ *Book ride* → "ride from [pickup] to [destination]"  
🚗 *Post trip* → "going from X to Y at 3pm"
📦 *Send package* → "delivery" + details
🛒 *More services* → Type "menu"

What would you like to do?"

For RETURNING USERS: 
- Help navigate services
- Answer questions about features
- Guide to specialized agents when needed

IMPORTANT: Always provide examples of how to use commands!`;

    case 'payment':
      return `${baseInfo}

You are the PaymentAgent handling ALL payment services:

CORE FUNCTIONS:
💰 QR Generation → "QR 5000" creates QR to receive 5,000 RWF
💸 Payment Help → Guide users through MoMo payments  
📱 Status Checks → "Did they pay?" checks recent transactions
🔄 Refunds → Handle wrong payments, disputes
📊 Split Bills → "Split 15k between 3 people"
🏪 Business Mode → Register shops, bars for recurring payments

ALWAYS ASK FOR:
- Amount (if not provided)
- Purpose (what's the payment for?)
- Confirmation before generating QR codes

RESPONSE PATTERN:
1. Confirm amount and purpose
2. Generate QR or provide guidance
3. Give clear next steps
4. Offer to save QR for reuse

Example: "Got it! Creating QR for 5,000 RWF. Customer scans with MoMo and pays instantly. Reply 'received' when payment comes through!"`;

    case 'logistics':
      return `${baseInfo}

You are the LogisticsAgent for transport coordination:

FOR DRIVERS:
🚗 Post trips → "I'm going from Nyamirambo to CBD at 4pm, 2 seats, 1500 RWF"
👥 View passengers → "Show passengers going my route"
✅ Manage bookings → Accept/decline passenger requests

FOR PASSENGERS:  
🏍️ Request rides → "Need moto from Kimironko to town at 5pm"
💰 Get fare estimates → "How much from Kicukiro to Gikondo?"
👀 Browse trips → See available drivers and their routes

ESSENTIAL QUESTIONS:
- Where are you now? (pickup location)
- Where are you going? (destination)
- When do you need to travel?
- How many passengers/seats?

ALWAYS:
- Confirm locations clearly (use landmarks)
- Provide fare estimates when possible
- Give ETA and contact details after booking
- No auto-assignments - let users choose drivers

Example response: "Found 3 drivers going to CBD around 5pm:
1. KG 123A - 1,200 RWF, leaves 4:45pm
2. KH 456B - 1,500 RWF, leaves 5:10pm  
Reply with number to book!"`;

    case 'escalation':
      return `${baseInfo}

You handle escalations and safety issues. 

FOR SAFETY ISSUES: Immediately acknowledge, collect basic details, and escalate to human support.
FOR DISPUTES: Get transaction details and escalate for amounts >100,000 RWF.
FOR GENERAL HELP: Connect users to human support quickly.

ALWAYS be empathetic and ensure users feel heard before escalating.`;

    default:
      return `${baseInfo}

You are a general assistant. Help users navigate to the right service:
- Payments: "pay", "money", "QR", "bill" 
- Transport: "ride", "trip", "moto", "driver"
- Support: "help", "human", "problem"

Guide them with specific examples of how to use each service.`;
  }
}

// Handle specific intents with dedicated edge functions
async function handleIntentWithFunction(intentResult: any, message: string, context: any): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log(`🔧 Handling intent ${intentResult.intent} with edge function`);

    switch (intentResult.intent) {
      case 'qr_generate_receive':
        // Handle QR generation for receiving payments
        const amount = intentResult.slots.amount || extractAmount(message);
        if (!amount) {
          return "I'll help you create a QR code! How much do you want to receive? For example: 'QR 5000' for 5,000 RWF.";
        }

        const { data: qrResult, error: qrError } = await supabase.functions.invoke('qr-render', {
          body: {
            text: `easyMO:${amount}:RWF:${context.userType || 'user'}`,
            agent: 'payment',
            entity: 'qr_receive',
            id: crypto.randomUUID()
          }
        });

        if (qrError) throw qrError;

        return `✅ QR code ready for ${amount.toLocaleString()} RWF!

Your payment QR: ${qrResult.url}

📋 Instructions:
• Customer scans with MoMo app
• They enter ${amount.toLocaleString()} RWF 
• Money arrives instantly
• Reply "received" when paid

💡 Save this QR for easy reuse!`;

      case 'driver_trip_create':
        // Handle driver trip posting
        const { origin, destination } = intentResult.slots;
        if (!origin || !destination) {
          return "I'll help you post a trip! Please tell me: going FROM [pickup] TO [destination] at [time]. Example: 'Trip from Nyamirambo to CBD at 4pm, 2 seats, 1500 RWF'";
        }

        const { data: tripResult, error: tripError } = await supabase.functions.invoke('driver-trip-create', {
          body: {
            from: context.phoneNumber || 'unknown',
            text: message,
            message_id: crypto.randomUUID()
          }
        });

        if (tripError) throw tripError;

        return tripResult.handled ? "🚀 Trip posted successfully! We'll notify you when passengers show interest." : 
               "I need more details. Try: 'Trip from [pickup] to [destination] at [time], [seats] seats, [price] RWF'";

      case 'passenger_intent_create':
        // Handle passenger ride requests
        const rideSlots = intentResult.slots;
        if (!rideSlots.origin || !rideSlots.destination) {
          return "I'll find you a ride! Please tell me: FROM [pickup] TO [destination] at [time]. Example: 'Need ride from Kimironko to CBD at 5pm'";
        }

        const { data: rideResult, error: rideError } = await supabase.functions.invoke('passenger-intent-create', {
          body: {
            from: context.phoneNumber || 'unknown',
            text: message,
            message_id: crypto.randomUUID()
          }
        });

        if (rideError) throw rideError;

        return rideResult.handled ? 
               `🏍️ Looking for rides... ${rideResult.trip_options || 'We\'ll notify you when drivers become available.'}` :
               "I need more details. Try: 'Need ride from [pickup] to [destination] at [time]'";

      case 'split_bill':
        // Handle split bill requests
        const { total_amount, num_people } = intentResult.slots;
        if (!total_amount || !num_people) {
          return "I'll help split the bill! Tell me the total amount and number of people. Example: 'Split 15000 between 3 people'";
        }

        const perPerson = Math.ceil(total_amount / num_people);
        const { data: splitResult, error: splitError } = await supabase.functions.invoke('qr-render', {
          body: {
            text: `easyMO:${perPerson}:RWF:split_bill`,
            agent: 'payment',
            entity: 'split_bill',
            id: crypto.randomUUID()
          }
        });

        if (splitError) throw splitError;

        return `💰 Bill Split Calculator:
Total: ${total_amount.toLocaleString()} RWF
People: ${num_people}
Each pays: ${perPerson.toLocaleString()} RWF

QR for individual payment: ${splitResult.url}

Share this QR with each person to collect ${perPerson.toLocaleString()} RWF each.`;

      case 'payment_status_check':
        return "I'll check your recent payments. Looking up your transaction history... For specific transactions, please provide the reference number or approximate time.";

      case 'fare_estimate':
        const routeInfo = intentResult.slots;
        if (routeInfo.origin && routeInfo.destination) {
          return `💰 Estimated fare ${routeInfo.origin} → ${routeInfo.destination}:

🏍️ Moto: 1,200 - 2,000 RWF
🚗 Car: 2,500 - 4,000 RWF

Actual prices may vary based on:
• Time of day
• Distance  
• Driver rates
• Traffic conditions

Type "ride from ${routeInfo.origin} to ${routeInfo.destination}" to book!`;
        }
        return "I'll estimate the fare! Tell me your route: 'How much from [pickup] to [destination]?'";

      default:
        return null; // Let AI handle other intents
    }

  } catch (error) {
    console.error(`❌ Error handling intent ${intentResult.intent}:`, error);
    return null; // Fall back to AI processing
  }
}

// Direct action handlers for instant responses
async function handleQRGeneration(amount: number, phoneNumber: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data: qrResult, error: qrError } = await supabase.functions.invoke('qr-render', {
      body: {
        text: `easyMO:${amount}:RWF:instant`,
        agent: 'payment',
        entity: 'qr_receive', 
        id: crypto.randomUUID()
      }
    });

    if (qrError) throw qrError;

    return `✅ QR code ready for ${amount.toLocaleString()} RWF!

Your payment QR: ${qrResult.url}

📋 Customer scans with MoMo → enters ${amount.toLocaleString()} → money arrives instantly!

Reply "received" when paid ✅`;

  } catch (error) {
    console.error('QR generation error:', error);
    return `I'll create your QR for ${amount.toLocaleString()} RWF. Having a small delay - please try again in a moment.`;
  }
}

async function handleSplitBill(totalAmount: number, numPeople: number, phoneNumber: string): Promise<string> {
  const perPerson = Math.ceil(totalAmount / numPeople);
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data: splitResult, error: splitError } = await supabase.functions.invoke('qr-render', {
      body: {
        text: `easyMO:${perPerson}:RWF:split_bill`,
        agent: 'payment',
        entity: 'split_bill',
        id: crypto.randomUUID()
      }
    });

    if (splitError) throw splitError;

    return `💰 Bill Split:
Total: ${totalAmount.toLocaleString()} RWF ÷ ${numPeople} people
Each pays: ${perPerson.toLocaleString()} RWF

QR for individual payment: ${splitResult.url}

Share this QR - each person scans & pays ${perPerson.toLocaleString()} RWF!`;

  } catch (error) {
    console.error('Split bill error:', error);
    return `Split: ${totalAmount.toLocaleString()} RWF ÷ ${numPeople} = ${perPerson.toLocaleString()} RWF each. Creating QR...`;
  }
}

async function handleFareEstimate(origin: string, destination: string): Promise<string> {
  return `💰 Fare estimate ${origin} → ${destination}:

🏍️ Moto: 1,200 - 2,000 RWF
🚗 Car: 2,500 - 4,000 RWF

Type "ride from ${origin} to ${destination}" to book!`;
}

async function routeToEdgeFunction(intentResult: any, context: any): Promise<string | null> {
  // For now, return null to let existing handleIntentWithFunction handle these
  return null;
}