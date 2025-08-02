import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  fallbackTemplates?: string[];
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, phone, sessionActive = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
  // 1. If session is active (within 24h), use interactive messages for most intents
  if (context.sessionActive) {
    const interactivePayload = await getInteractivePayloadForContext(message, context);
    return {
      action: 'interactive',
      confidence: 0.85,
      reasoning: 'Active session detected, using interactive flow',
      payload: interactivePayload
    };
  }

  // 2. Outside 24h window - use smart template routing
  try {
    console.log('🎯 Calling smart template router for advanced template selection');
    
    const { data: smartRouting, error } = await supabase.functions.invoke('smart-template-router', {
      body: {
        message,
        phone: context.phone,
        userId: context.userId,
        sessionActive: context.sessionActive
      }
    });

    if (error) {
      console.error('Smart template router error:', error);
      throw error;
    }

    if (smartRouting?.success && smartRouting.routing) {
      const routing = smartRouting.routing;
      return {
        action: 'template',
        templateName: routing.templateName,
        confidence: routing.confidence,
        reasoning: `Smart routing: ${routing.reasoning}`,
        fallbackTemplates: routing.fallbackTemplates,
        metadata: routing.metadata
      };
    }
  } catch (error) {
    console.error('Smart template routing failed, using fallback logic:', error);
  }

  // 3. Fallback to basic template routing if smart routing fails
  return await getBasicTemplateRouting(supabase, message, context);
}

async function getInteractivePayloadForContext(message: string, context: MessageContext): Promise<string> {
  const lowerMsg = message.toLowerCase();
  
  // Quick intent detection for interactive payloads
  if (lowerMsg.includes('pay') || lowerMsg.includes('money') || lowerMsg.includes('qr')) {
    return 'PAY_MENU';
  }
  if (lowerMsg.includes('ride') || lowerMsg.includes('taxi') || lowerMsg.includes('moto')) {
    return context.userType === 'driver' ? 'DRV_STATUS' : 'PAX_REQUEST';
  }
  if (lowerMsg.includes('property') || lowerMsg.includes('house') || lowerMsg.includes('rent')) {
    return 'PROP_MENU';
  }
  if (lowerMsg.includes('car') || lowerMsg.includes('vehicle')) {
    return 'VEH_MENU';
  }
  if (lowerMsg.includes('order') || lowerMsg.includes('shop') || lowerMsg.includes('pharmacy')) {
    return 'ORD_MENU';
  }
  if (lowerMsg.includes('help') || lowerMsg.includes('support')) {
    return 'SUP_MENU';
  }
  
  return 'MAIN_MENU';
}

async function getBasicTemplateRouting(supabase: any, message: string, context: MessageContext): Promise<RoutingDecision> {
  const lowerMsg = message.toLowerCase();
  
  // Basic intent patterns for fallback
  const basicPatterns = {
    payment: ['pay', 'payment', 'momo', 'money', 'qr', 'generate', 'scan'],
    driver: ['driver', 'online', 'offline', 'available', 'busy', 'status'],
    property: ['house', 'rent', 'property', 'apartment', 'home'],
    vehicle: ['car', 'vehicle', 'sell car', 'buy car', 'moto sale'],
    ride: ['ride', 'taxi', 'passenger', 'book', 'trip'],
    support: ['help', 'support', 'problem', 'issue']
  };

  // Driver-specific routing
  if (context.userType === 'driver') {
    if (basicPatterns.driver.some(keyword => lowerMsg.includes(keyword))) {
      return {
        action: 'template',
        templateName: 'tpl_driver_status_v1',
        confidence: 0.8,
        reasoning: 'Driver requesting status - basic fallback'
      };
    }
  }

  // Intent-based basic routing
  for (const [intent, keywords] of Object.entries(basicPatterns)) {
    if (keywords.some(keyword => lowerMsg.includes(keyword))) {
      const templateName = getBasicTemplateForIntent(intent, context);
      if (templateName) {
        return {
          action: 'template',
          templateName,
          confidence: 0.7,
          reasoning: `Basic intent detected: ${intent}`
        };
      }
    }
  }

  // New user
  if (context.userType === 'new' || context.conversationCount === 0) {
    return {
      action: 'template',
      templateName: 'tpl_welcome_quick_v1',
      confidence: 0.9,
      reasoning: 'New user - welcome template'
    };
  }

  // Default fallback
  return {
    action: 'template',
    templateName: 'tpl_welcome_quick_v1',
    confidence: 0.5,
    reasoning: 'Default fallback template'
  };
}

function getBasicTemplateForIntent(intent: string, context: MessageContext): string | null {
  const templateMap: Record<string, string> = {
    payment: 'tpl_payments_quick_v1',
    driver: 'tpl_driver_status_v1',
    property: 'tpl_property_quick_v1',
    vehicle: 'tpl_vehicle_quick_v1',
    ride: context.userType === 'driver' ? 'tpl_driver_status_v1' : 'tpl_passenger_quick_v1',
    support: 'tpl_support_quick_v1'
  };
  return templateMap[intent] || null;
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