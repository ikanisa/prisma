import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageContext {
  message: string;
  userId: string;
  phone: string;
  sessionActive: boolean;
  userType?: string;
  lastInteraction?: string;
  conversationCount?: number;
  preferredLanguage?: string;
}

interface RoutingDecision {
  action: 'template' | 'interactive' | 'agent';
  templateName?: string;
  confidence: number;
  reasoning: string;
  payload?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, phone, sessionActive = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🧠 Intelligent routing for ${userId}: "${message}"`);

    // Get user context
    const context = await getUserContext(supabase, userId, phone, sessionActive);
    
    // Apply intelligent routing logic
    const routing = await determineRouting(supabase, message, context);

    console.log(`📍 Routing decision:`, routing);

    // Log the routing decision
    await logRoutingDecision(supabase, userId, message, routing);

    return new Response(JSON.stringify({
      success: true,
      routing,
      context: {
        userType: context.userType,
        sessionActive: context.sessionActive
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in intelligent message router:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback: { action: 'template', templateName: 'tpl_welcome_quick_v1', confidence: 0.5 }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getUserContext(supabase: any, userId: string, phone: string, sessionActive: boolean): Promise<MessageContext> {
  try {
    // Get user contact info
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phone)
      .single();

    // Check if user is a driver
    const { data: driver } = await supabase
      .from('drivers')
      .select('status')
      .eq('phone_number', phone)
      .single();

    // Get recent conversation analytics
    const { data: analytics } = await supabase
      .from('conversation_analytics')
      .select('*')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      message: '',
      userId,
      phone,
      sessionActive,
      userType: driver ? 'driver' : (analytics?.total_messages > 5 ? 'returning' : 'new'),
      lastInteraction: contact?.last_interaction,
      conversationCount: contact?.total_conversations || 0,
      preferredLanguage: 'en' // Default, can be enhanced
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return {
      message: '',
      userId,
      phone,
      sessionActive,
      userType: 'new',
      conversationCount: 0
    };
  }
}

async function determineRouting(supabase: any, message: string, context: MessageContext): Promise<RoutingDecision> {
  const lowerMsg = message.toLowerCase();
  
  // Intent detection patterns
  const intentPatterns = {
    payment: ['pay', 'payment', 'momo', 'money', 'qr', 'generate', 'scan'],
    ride: ['ride', 'taxi', 'moto', 'driver', 'transport', 'trip'],
    property: ['house', 'rent', 'property', 'apartment', 'home'],
    vehicle: ['car', 'vehicle', 'sell car', 'buy car', 'moto sale'],
    ordering: ['order', 'food', 'drink', 'bar', 'pharmacy', 'shop'],
    support: ['help', 'support', 'problem', 'issue', 'talk', 'human'],
    driver_status: ['online', 'offline', 'available', 'busy', 'location']
  };

  // 1. If session is active (within 24h), use interactive messages for most intents
  if (context.sessionActive) {
    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(keyword => lowerMsg.includes(keyword))) {
        return {
          action: 'interactive',
          confidence: 0.85,
          reasoning: `Active session detected, using interactive flow for ${intent}`,
          payload: getPayloadForIntent(intent)
        };
      }
    }
    
    return {
      action: 'interactive',
      confidence: 0.7,
      reasoning: 'Active session - using interactive menu',
      payload: 'MAIN_MENU'
    };
  }

  // 2. Outside 24h window - need templates
  
  // Driver-specific routing
  if (context.userType === 'driver') {
    if (intentPatterns.driver_status.some(keyword => lowerMsg.includes(keyword))) {
      return {
        action: 'template',
        templateName: 'tpl_driver_status_v1',
        confidence: 0.9,
        reasoning: 'Driver requesting status change'
      };
    }
  }

  // Intent-based template routing
  for (const [intent, keywords] of Object.entries(intentPatterns)) {
    if (keywords.some(keyword => lowerMsg.includes(keyword))) {
      const templateName = getTemplateForIntent(intent, context);
      if (templateName) {
        return {
          action: 'template',
          templateName,
          confidence: 0.8,
          reasoning: `Intent detected: ${intent}`
        };
      }
    }
  }

  // 3. New user or no clear intent
  if (context.userType === 'new' || context.conversationCount === 0) {
    return {
      action: 'template',
      templateName: 'tpl_welcome_quick_v1',
      confidence: 0.9,
      reasoning: 'New user - showing welcome template'
    };
  }

  // 4. Returning user - contextual template
  const contextualTemplate = await getContextualTemplate(supabase, context);
  return {
    action: 'template',
    templateName: contextualTemplate,
    confidence: 0.6,
    reasoning: 'Returning user - contextual template based on history'
  };
}

function getPayloadForIntent(intent: string): string {
  const payloadMap: Record<string, string> = {
    payment: 'PAY_MENU',
    ride: 'PAX_REQUEST',
    property: 'PROP_MENU',
    vehicle: 'VEH_MENU',
    ordering: 'ORD_MENU',
    support: 'SUP_MENU',
    driver_status: 'DRV_STATUS'
  };
  return payloadMap[intent] || 'MAIN_MENU';
}

function getTemplateForIntent(intent: string, context: MessageContext): string | null {
  const templateMap: Record<string, string> = {
    payment: 'tpl_payments_quick_v1',
    ride: context.userType === 'driver' ? 'tpl_driver_status_v1' : 'tpl_passenger_quick_v1',
    property: 'tpl_property_quick_v1',
    vehicle: 'tpl_vehicle_quick_v1',
    ordering: 'tpl_ordering_quick_v1',
    support: 'tpl_support_quick_v1'
  };
  return templateMap[intent] || null;
}

async function getContextualTemplate(supabase: any, context: MessageContext): Promise<string> {
  try {
    // Get user's most recent activities to suggest relevant template
    const { data: recent } = await supabase
      .from('conversation_analytics')
      .select('conversion_event')
      .eq('phone_number', context.phone)
      .not('conversion_event', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (recent?.length) {
      const lastEvent = recent[0].conversion_event;
      if (lastEvent.includes('payment')) return 'tpl_payments_quick_v1';
      if (lastEvent.includes('ride')) return 'tpl_passenger_quick_v1';
      if (lastEvent.includes('order')) return 'tpl_ordering_quick_v1';
    }

    // Default for returning users
    return 'tpl_welcome_quick_v1';
  } catch (error) {
    console.error('Error getting contextual template:', error);
    return 'tpl_welcome_quick_v1';
  }
}

async function logRoutingDecision(supabase: any, userId: string, message: string, routing: RoutingDecision) {
  try {
    await supabase
      .from('agent_execution_log')
      .insert({
        user_id: userId,
        function_name: 'intelligent-message-router',
        input_data: { message, routing },
        success_status: true,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging routing decision:', error);
  }
}