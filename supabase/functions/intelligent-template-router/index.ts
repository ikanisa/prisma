import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserContext {
  phone: string;
  name?: string;
  preferredLanguage?: string;
  lastInteraction?: string;
  userType?: string;
  conversationCount?: number;
  domain_preferences?: string[];
}

interface TemplateMetrics {
  templateName: string;
  clickRate?: number;
  conversionRate?: number;
  avgResponseTime?: number;
  userSegment?: string;
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, context, sessionExpired = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log(`🧠 Intelligent template routing for ${userId}: "${message}"`);

    // Get user context and preferences
    const userContext = await getUserContext(supabase, userId, context);
    
    // Determine the best template using AI + analytics
    const templateDecision = await determineOptimalTemplate(
      supabase, 
      message, 
      userContext, 
      sessionExpired
    );

    console.log(`🎯 Template decision:`, templateDecision);

    return new Response(JSON.stringify({
      success: true,
      templateName: templateDecision.templateName,
      confidence: templateDecision.confidence,
      reasoning: templateDecision.reasoning,
      context: templateDecision.context
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in intelligent template router:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback: 'tpl_welcome_quick_v1' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getUserContext(supabase: any, userId: string, providedContext?: any): Promise<UserContext> {
  try {
    // Get user data from contacts table
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', userId)
      .single();

    // Get recent conversation analytics
    const { data: analytics } = await supabase
      .from('conversation_analytics')
      .select('*')
      .eq('phone_number', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Extract domain preferences from recent interactions
    const domainPreferences = extractDomainPreferences(analytics);

    return {
      phone: userId,
      name: contact?.name || providedContext?.name,
      preferredLanguage: providedContext?.preferredLanguage || 'en',
      lastInteraction: contact?.last_interaction,
      userType: determineUserType(contact, analytics),
      conversationCount: contact?.total_conversations || 0,
      domain_preferences: domainPreferences
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return {
      phone: userId,
      preferredLanguage: 'en',
      userType: 'new',
      conversationCount: 0
    };
  }
}

function extractDomainPreferences(analytics: any[]): string[] {
  if (!analytics?.length) return [];
  
  const domains = analytics
    .map(a => a.conversion_event)
    .filter(Boolean)
    .map(event => {
      if (event.includes('pay') || event.includes('payment')) return 'payment';
      if (event.includes('ride') || event.includes('driver')) return 'transport';
      if (event.includes('order') || event.includes('shop')) return 'commerce';
      if (event.includes('property') || event.includes('house')) return 'property';
      if (event.includes('vehicle') || event.includes('car')) return 'vehicle';
      return null;
    })
    .filter(Boolean);

  return [...new Set(domains)];
}

function determineUserType(contact: any, analytics: any[]): string {
  if (!contact) return 'new';
  if (contact.total_conversations > 10) return 'power_user';
  if (contact.total_conversations > 3) return 'active';
  return 'casual';
}

async function determineOptimalTemplate(
  supabase: any, 
  message: string, 
  userContext: UserContext, 
  sessionExpired: boolean
): Promise<{templateName: string; confidence: number; reasoning: string; context: any}> {
  
  // Intent detection with keyword matching
  const intent = detectIntent(message.toLowerCase());
  
  // Get template performance metrics
  const templateMetrics = await getTemplateMetrics(supabase, userContext);
  
  // Apply intelligent routing logic
  let templateName = 'tpl_welcome_quick_v1'; // default fallback
  let confidence = 0.5;
  let reasoning = 'Default welcome template';
  
  // New user or session expired - use welcome
  if (userContext.userType === 'new' || sessionExpired) {
    templateName = 'tpl_welcome_quick_v1';
    confidence = 0.9;
    reasoning = 'New user or expired session';
  }
  // Intent-based routing
  else if (intent.domain && intent.confidence > 0.7) {
    const intentTemplate = getTemplateForIntent(intent, userContext, templateMetrics);
    templateName = intentTemplate.name;
    confidence = intent.confidence * intentTemplate.confidence;
    reasoning = `Intent detected: ${intent.domain} (${intent.intent})`;
  }
  // User preference-based routing
  else if (userContext.domain_preferences?.length) {
    const preferredDomain = userContext.domain_preferences[0];
    const prefTemplate = getTemplateForDomain(preferredDomain, templateMetrics);
    templateName = prefTemplate.name;
    confidence = 0.7;
    reasoning = `User preference: ${preferredDomain}`;
  }
  // Default contextual routing
  else {
    const contextTemplate = getContextualTemplate(userContext, templateMetrics);
    templateName = contextTemplate.name;
    confidence = contextTemplate.confidence;
    reasoning = contextTemplate.reasoning;
  }

  return {
    templateName,
    confidence,
    reasoning,
    context: {
      intent,
      userType: userContext.userType,
      domainPreferences: userContext.domain_preferences
    }
  };
}

function detectIntent(message: string): {domain: string; intent: string; confidence: number} {
  const intentPatterns = {
    payment: {
      patterns: ['pay', 'payment', 'momo', 'money', 'qr', 'scan', 'generate'],
      intents: ['pay_qr', 'pay_scan', 'pay_send']
    },
    transport: {
      patterns: ['ride', 'driver', 'taxi', 'moto', 'transport', 'trip', 'travel'],
      intents: ['request_ride', 'find_driver', 'trip_status']
    },
    commerce: {
      patterns: ['shop', 'buy', 'order', 'bar', 'pharmacy', 'food', 'drink'],
      intents: ['browse_shop', 'place_order', 'find_business']
    },
    property: {
      patterns: ['house', 'rent', 'property', 'apartment', 'home', 'real estate'],
      intents: ['find_rental', 'list_property', 'property_search']
    },
    vehicle: {
      patterns: ['car', 'vehicle', 'sell car', 'buy car', 'auto'],
      intents: ['find_vehicle', 'list_vehicle', 'vehicle_search']
    },
    support: {
      patterns: ['help', 'support', 'issue', 'problem', 'complain'],
      intents: ['get_help', 'report_issue', 'talk_human']
    }
  };

  let bestMatch = { domain: '', intent: '', confidence: 0 };

  for (const [domain, config] of Object.entries(intentPatterns)) {
    const matches = config.patterns.filter(pattern => message.includes(pattern));
    if (matches.length > 0) {
      const confidence = matches.length / config.patterns.length;
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          domain,
          intent: config.intents[0], // Take first intent as primary
          confidence: Math.min(confidence * 2, 1) // Boost but cap at 1
        };
      }
    }
  }

  return bestMatch;
}

async function getTemplateMetrics(supabase: any, userContext: UserContext): Promise<TemplateMetrics[]> {
  try {
    // Get template performance data from logs
    const { data: metrics } = await supabase
      .from('template_sends')
      .select('template_name, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('created_at', { ascending: false });

    // Calculate basic metrics (in real implementation, you'd have more sophisticated analytics)
    const templateGroups = metrics?.reduce((acc: any, item: any) => {
      if (!acc[item.template_name]) acc[item.template_name] = [];
      acc[item.template_name].push(item);
      return acc;
    }, {}) || {};

    return Object.entries(templateGroups).map(([name, sends]: [string, any]) => ({
      templateName: name,
      clickRate: Math.random() * 0.3 + 0.6, // Mock: 60-90% click rate
      conversionRate: Math.random() * 0.2 + 0.3, // Mock: 30-50% conversion
      avgResponseTime: Math.random() * 30 + 10, // Mock: 10-40 seconds
      userSegment: userContext.userType
    }));
  } catch (error) {
    console.error('Error getting template metrics:', error);
    return [];
  }
}

function getTemplateForIntent(intent: any, userContext: UserContext, metrics: TemplateMetrics[]): {name: string; confidence: number} {
  const templateMap: Record<string, string> = {
    payment: 'tpl_payments_quick_v1',
    transport: userContext.userType === 'driver' ? 'tpl_driver_status_v1' : 'tpl_passenger_quick_v1',
    commerce: 'tpl_ordering_quick_v1',
    property: 'tpl_property_quick_v1',
    vehicle: 'tpl_vehicle_quick_v1',
    support: 'tpl_support_quick_v1'
  };

  const templateName = templateMap[intent.domain] || 'tpl_welcome_quick_v1';
  
  // Check template performance
  const templateMetric = metrics.find(m => m.templateName === templateName);
  const performanceBoost = templateMetric?.clickRate ? templateMetric.clickRate * 0.2 : 0;
  
  return {
    name: templateName,
    confidence: Math.min(intent.confidence + performanceBoost, 1)
  };
}

function getTemplateForDomain(domain: string, metrics: TemplateMetrics[]): {name: string; confidence: number} {
  const domainTemplates: Record<string, string> = {
    payment: 'tpl_payments_quick_v1',
    transport: 'tpl_passenger_quick_v1',
    commerce: 'tpl_ordering_quick_v1',
    property: 'tpl_property_quick_v1',
    vehicle: 'tpl_vehicle_quick_v1'
  };

  const templateName = domainTemplates[domain] || 'tpl_welcome_quick_v1';
  const templateMetric = metrics.find(m => m.templateName === templateName);
  
  return {
    name: templateName,
    confidence: templateMetric?.clickRate || 0.6
  };
}

function getContextualTemplate(userContext: UserContext, metrics: TemplateMetrics[]): {name: string; confidence: number; reasoning: string} {
  // Power users might prefer settings or advanced features
  if (userContext.userType === 'power_user') {
    return {
      name: 'tpl_settings_quick_v1',
      confidence: 0.7,
      reasoning: 'Power user - settings template'
    };
  }
  
  // Casual users get the main welcome menu
  return {
    name: 'tpl_welcome_quick_v1',
    confidence: 0.8,
    reasoning: 'Default welcome for casual user'
  };
}