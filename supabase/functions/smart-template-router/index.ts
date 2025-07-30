import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageContext {
  message: string;
  phone: string;
  userId?: string;
  sessionActive: boolean;
  userType?: string;
  lastInteraction?: string;
  conversationCount?: number;
  preferredLanguage?: string;
  location?: any;
  recentIntents?: string[];
}

interface TemplateRoutingDecision {
  templateName: string;
  confidence: number;
  reasoning: string;
  domain: string;
  fallbackTemplates: string[];
  metadata: {
    intent: string;
    priority: number;
    context: any;
  };
}

interface DomainRule {
  keywords: string[];
  templates: string[];
  priority: number;
  fallback: string;
  contextRequirements?: string[];
}

const DOMAIN_RULES: Record<string, DomainRule> = {
  payment: {
    keywords: ['pay', 'payment', 'momo', 'money', 'qr', 'generate', 'scan', 'amount', 'rwf', 'send money', 'transfer'],
    templates: ['tpl_payments_quick_v1', 'tpl_payment_confirmation_v1', 'tpl_payment_status_v1'],
    priority: 10,
    fallback: 'tpl_payments_quick_v1'
  },
  driver: {
    keywords: ['driver', 'online', 'offline', 'available', 'busy', 'status', 'location', 'moto', 'car', 'transport'],
    templates: ['tpl_driver_status_v1', 'tpl_driver_earnings_v1', 'tpl_driver_location_v1'],
    priority: 9,
    fallback: 'tpl_driver_status_v1',
    contextRequirements: ['driver_profile']
  },
  property: {
    keywords: ['house', 'rent', 'property', 'apartment', 'home', 'listing', 'real estate', 'land', 'room'],
    templates: ['tpl_property_quick_v1', 'tpl_property_listing_v1', 'tpl_property_search_v1'],
    priority: 8,
    fallback: 'tpl_property_quick_v1'
  },
  vehicle: {
    keywords: ['car', 'vehicle', 'sell car', 'buy car', 'moto sale', 'auto', 'bike', 'motorcycle'],
    templates: ['tpl_vehicle_quick_v1', 'tpl_vehicle_listing_v1', 'tpl_vehicle_valuation_v1'],
    priority: 8,
    fallback: 'tpl_vehicle_quick_v1'
  },
  ride: {
    keywords: ['ride', 'taxi', 'pickup', 'drop', 'book', 'trip', 'passenger', 'destination'],
    templates: ['tpl_passenger_quick_v1', 'tpl_ride_booking_v1', 'tpl_trip_status_v1'],
    priority: 7,
    fallback: 'tpl_passenger_quick_v1'
  },
  commerce: {
    keywords: ['order', 'buy', 'shop', 'pharmacy', 'food', 'drink', 'store', 'market', 'product'],
    templates: ['tpl_ordering_quick_v1', 'tpl_pharmacy_quick_v1', 'tpl_market_menu_v1'],
    priority: 6,
    fallback: 'tpl_ordering_quick_v1'
  },
  support: {
    keywords: ['help', 'support', 'problem', 'issue', 'talk', 'human', 'assistance', 'question'],
    templates: ['tpl_support_quick_v1', 'tpl_escalation_v1', 'tpl_faq_v1'],
    priority: 5,
    fallback: 'tpl_support_quick_v1'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, phone, userId, sessionActive = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🎯 Smart Template Router: ${phone} - "${message}"`);

    // Build comprehensive message context
    const context = await buildMessageContext(supabase, message, phone, userId, sessionActive);
    
    // Apply smart template routing logic
    const routing = await determineSmartTemplateRouting(supabase, context);

    console.log(`📍 Template routing decision:`, routing);

    // Log routing decision for analytics
    await logTemplateRoutingDecision(supabase, context, routing);

    // Track template analytics
    await trackTemplateRouting(supabase, routing, context);

    return new Response(JSON.stringify({
      success: true,
      routing,
      context: {
        domain: routing.domain,
        confidence: routing.confidence,
        userType: context.userType
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Smart Template Router error:', error);
    
    // Fallback with basic welcome template
    const fallbackRouting: TemplateRoutingDecision = {
      templateName: 'tpl_welcome_quick_v1',
      confidence: 0.3,
      reasoning: 'Error fallback - using welcome template',
      domain: 'general',
      fallbackTemplates: ['tpl_support_quick_v1', 'tpl_main_menu_v1'],
      metadata: {
        intent: 'error_fallback',
        priority: 1,
        context: { error: error.message }
      }
    };

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      routing: fallbackRouting
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function buildMessageContext(
  supabase: any, 
  message: string, 
  phone: string, 
  userId?: string, 
  sessionActive: boolean = false
): Promise<MessageContext> {
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
      .select('status, location')
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

    // Get recent template sends for intent patterns
    const { data: recentTemplates } = await supabase
      .from('template_sends')
      .select('template_name, event_type, metadata')
      .eq('wa_id', phone)
      .order('sent_at', { ascending: false })
      .limit(5);

    // Extract recent intents from metadata
    const recentIntents = recentTemplates?.map(t => 
      t.metadata?.intent || extractIntentFromTemplateName(t.template_name)
    ).filter(Boolean) || [];

    // Determine user type with enhanced logic
    let userType = 'new';
    if (driver) {
      userType = 'driver';
    } else if (analytics?.total_messages > 10) {
      userType = 'power_user';
    } else if (analytics?.total_messages > 0) {
      userType = 'returning';
    }

    return {
      message,
      phone,
      userId,
      sessionActive,
      userType,
      lastInteraction: contact?.last_interaction,
      conversationCount: contact?.total_conversations || 0,
      preferredLanguage: contact?.preferred_channel || 'en',
      location: driver?.location || null,
      recentIntents
    };

  } catch (error) {
    console.error('Error building message context:', error);
    return {
      message,
      phone,
      userId,
      sessionActive,
      userType: 'new',
      conversationCount: 0,
      recentIntents: []
    };
  }
}

async function determineSmartTemplateRouting(
  supabase: any, 
  context: MessageContext
): Promise<TemplateRoutingDecision> {
  
  const lowerMsg = context.message.toLowerCase();
  const scores: Array<{domain: string, score: number, rule: DomainRule}> = [];

  // 1. Score each domain based on keyword matching and context
  for (const [domain, rule] of Object.entries(DOMAIN_RULES)) {
    let score = 0;
    
    // Keyword matching
    const keywordMatches = rule.keywords.filter(keyword => 
      lowerMsg.includes(keyword.toLowerCase())
    ).length;
    score += keywordMatches * rule.priority;

    // Context requirements
    if (rule.contextRequirements) {
      for (const requirement of rule.contextRequirements) {
        if (requirement === 'driver_profile' && context.userType === 'driver') {
          score += 15; // Bonus for driver context
        }
      }
    }

    // Recent intent bonus
    if (context.recentIntents?.includes(domain)) {
      score += 5;
    }

    // User type bonuses
    if (domain === 'driver' && context.userType === 'driver') {
      score += 20;
    }
    if (domain === 'payment' && context.userType === 'power_user') {
      score += 3;
    }

    if (score > 0) {
      scores.push({ domain, score, rule });
    }
  }

  // 2. Sort by score and select best match
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    // No clear domain match - use contextual fallback
    return await getContextualFallback(supabase, context);
  }

  const bestMatch = scores[0];
  
  // 3. Select specific template within domain
  const templateName = await selectBestTemplateInDomain(
    supabase, 
    bestMatch.domain, 
    bestMatch.rule, 
    context
  );

  // 4. Build fallback chain
  const fallbackTemplates = buildFallbackChain(bestMatch.rule, scores.slice(1, 3));

  // 5. Calculate confidence
  const confidence = Math.min(0.95, Math.max(0.3, bestMatch.score / 100));

  return {
    templateName,
    confidence,
    reasoning: `Domain: ${bestMatch.domain}, Score: ${bestMatch.score}, Keywords: ${bestMatch.rule.keywords.filter(k => lowerMsg.includes(k)).join(', ')}`,
    domain: bestMatch.domain,
    fallbackTemplates,
    metadata: {
      intent: bestMatch.domain,
      priority: bestMatch.rule.priority,
      context: {
        userType: context.userType,
        sessionActive: context.sessionActive,
        keywordMatches: bestMatch.rule.keywords.filter(k => lowerMsg.includes(k))
      }
    }
  };
}

async function selectBestTemplateInDomain(
  supabase: any,
  domain: string,
  rule: DomainRule,
  context: MessageContext
): Promise<string> {
  
  try {
    // Check template performance to select best performing template
    const { data: performance } = await supabase
      .from('template_performance_metrics')
      .select('template_name, success_rate, avg_response_time')
      .in('template_name', rule.templates)
      .eq('domain', domain)
      .order('success_rate', { ascending: false })
      .limit(1)
      .single();

    if (performance && performance.success_rate > 0.7) {
      return performance.template_name;
    }
  } catch (error) {
    console.log('No performance data available, using default template selection');
  }

  // Context-based template selection
  if (domain === 'payment') {
    const hasNumbers = /\d/.test(context.message);
    if (hasNumbers) return 'tpl_payment_confirmation_v1';
  }

  if (domain === 'driver' && context.location) {
    return 'tpl_driver_location_v1';
  }

  if (domain === 'property' && context.message.includes('search')) {
    return 'tpl_property_search_v1';
  }

  // Default to first template in domain
  return rule.templates[0] || rule.fallback;
}

function buildFallbackChain(primaryRule: DomainRule, alternativeMatches: Array<{domain: string, rule: DomainRule}>): string[] {
  const fallbacks = [primaryRule.fallback];
  
  // Add alternative domain templates
  alternativeMatches.forEach(match => {
    fallbacks.push(match.rule.fallback);
  });

  // Add general fallbacks
  fallbacks.push('tpl_welcome_quick_v1', 'tpl_support_quick_v1');

  // Remove duplicates and return first 3
  return [...new Set(fallbacks)].slice(0, 3);
}

async function getContextualFallback(
  supabase: any, 
  context: MessageContext
): Promise<TemplateRoutingDecision> {
  
  // New user welcome
  if (context.userType === 'new' || context.conversationCount === 0) {
    return {
      templateName: 'tpl_welcome_quick_v1',
      confidence: 0.9,
      reasoning: 'New user - welcome template',
      domain: 'onboarding',
      fallbackTemplates: ['tpl_main_menu_v1', 'tpl_support_quick_v1'],
      metadata: {
        intent: 'onboarding',
        priority: 10,
        context: { userType: context.userType }
      }
    };
  }

  // Driver-specific fallback
  if (context.userType === 'driver') {
    return {
      templateName: 'tpl_driver_status_v1',
      confidence: 0.8,
      reasoning: 'Driver user - status template',
      domain: 'driver',
      fallbackTemplates: ['tpl_driver_earnings_v1', 'tpl_welcome_quick_v1'],
      metadata: {
        intent: 'driver_general',
        priority: 8,
        context: { userType: context.userType }
      }
    };
  }

  // Returning user with recent intent
  if (context.recentIntents?.length) {
    const lastIntent = context.recentIntents[0];
    const rule = DOMAIN_RULES[lastIntent];
    if (rule) {
      return {
        templateName: rule.fallback,
        confidence: 0.7,
        reasoning: `Recent intent: ${lastIntent}`,
        domain: lastIntent,
        fallbackTemplates: buildFallbackChain(rule, []),
        metadata: {
          intent: lastIntent,
          priority: rule.priority,
          context: { source: 'recent_intent' }
        }
      };
    }
  }

  // Default general fallback
  return {
    templateName: 'tpl_welcome_quick_v1',
    confidence: 0.6,
    reasoning: 'General fallback for returning user',
    domain: 'general',
    fallbackTemplates: ['tpl_main_menu_v1', 'tpl_support_quick_v1'],
    metadata: {
      intent: 'general',
      priority: 5,
      context: { userType: context.userType }
    }
  };
}

function extractIntentFromTemplateName(templateName: string): string {
  if (templateName.includes('payment')) return 'payment';
  if (templateName.includes('driver')) return 'driver';
  if (templateName.includes('property')) return 'property';
  if (templateName.includes('vehicle')) return 'vehicle';
  if (templateName.includes('passenger') || templateName.includes('ride')) return 'ride';
  if (templateName.includes('order') || templateName.includes('pharmacy')) return 'commerce';
  if (templateName.includes('support')) return 'support';
  return 'general';
}

async function logTemplateRoutingDecision(
  supabase: any, 
  context: MessageContext, 
  routing: TemplateRoutingDecision
) {
  try {
    await supabase
      .from('agent_execution_log')
      .insert({
        user_id: context.phone,
        function_name: 'smart-template-router',
        input_data: { 
          message: context.message, 
          routing: routing,
          context: {
            userType: context.userType,
            domain: routing.domain,
            confidence: routing.confidence
          }
        },
        success_status: true,
        execution_time_ms: Date.now(),
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging template routing decision:', error);
  }
}

async function trackTemplateRouting(
  supabase: any, 
  routing: TemplateRoutingDecision, 
  context: MessageContext
) {
  try {
    // Track in template_sends for analytics
    await supabase
      .from('template_sends')
      .insert({
        wa_id: context.phone,
        template_name: routing.templateName,
        event_type: 'routed',
        metadata: {
          domain: routing.domain,
          confidence: routing.confidence,
          intent: routing.metadata.intent,
          user_type: context.userType,
          routing_source: 'smart-template-router',
          fallback_templates: routing.fallbackTemplates,
          reasoning: routing.reasoning
        }
      });
  } catch (error) {
    console.error('Error tracking template routing:', error);
  }
}