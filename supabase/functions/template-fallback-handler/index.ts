import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FallbackRequest {
  originalTemplate: string;
  failureReason: string;
  phone: string;
  context?: any;
  attemptCount?: number;
}

interface FallbackResponse {
  success: boolean;
  templateName: string;
  confidence: number;
  reasoning: string;
  isLastResort: boolean;
  metadata: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      originalTemplate, 
      failureReason, 
      phone, 
      context = {}, 
      attemptCount = 1 
    }: FallbackRequest = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log(`🔄 Template fallback handler: ${originalTemplate} failed for ${phone}`);
    console.log(`Reason: ${failureReason}, Attempt: ${attemptCount}`);

    // Log the template failure
    await logTemplateFailure(supabase, originalTemplate, failureReason, phone, context);

    // Get fallback template using intelligent logic
    const fallback = await determineFallbackTemplate(
      supabase, 
      originalTemplate, 
      failureReason, 
      phone, 
      context, 
      attemptCount
    );

    // Track fallback metrics
    await trackFallbackMetrics(supabase, originalTemplate, fallback.templateName, failureReason);

    console.log(`✅ Fallback selected: ${fallback.templateName} (confidence: ${fallback.confidence})`);

    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Template fallback handler error:', error);
    
    // Ultimate fallback
    const lastResortFallback: FallbackResponse = {
      success: true,
      templateName: 'tpl_welcome_quick_v1',
      confidence: 0.2,
      reasoning: `Error in fallback handler: ${error.message}`,
      isLastResort: true,
      metadata: {
        error: error.message,
        fallbackLevel: 'emergency'
      }
    };

    return new Response(JSON.stringify(lastResortFallback), {
      status: 200, // Still return 200 to provide fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function determineFallbackTemplate(
  supabase: any,
  originalTemplate: string,
  failureReason: string,
  phone: string,
  context: any,
  attemptCount: number
): Promise<FallbackResponse> {

  // 1. Get user context for smart fallback selection
  const userContext = await getUserContextForFallback(supabase, phone);
  
  // 2. Determine domain and intent from original template
  const domain = extractDomainFromTemplate(originalTemplate);
  const intent = extractIntentFromTemplate(originalTemplate);

  // 3. Apply fallback strategy based on attempt count and failure reason
  if (attemptCount === 1) {
    // First fallback attempt - try alternative template in same domain
    const alternateFallback = await getAlternativeInDomain(supabase, domain, originalTemplate, userContext);
    if (alternateFallback) {
      return alternateFallback;
    }
  }

  if (attemptCount === 2) {
    // Second fallback attempt - try related domain template
    const relatedFallback = await getRelatedDomainTemplate(supabase, domain, userContext);
    if (relatedFallback) {
      return relatedFallback;
    }
  }

  // 3+ attempts or critical failures - use safe general templates
  return await getSafeGeneralTemplate(userContext, attemptCount);
}

async function getUserContextForFallback(supabase: any, phone: string): Promise<any> {
  try {
    // Get user profile
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phone)
      .single();

    // Check if driver
    const { data: driver } = await supabase
      .from('drivers')
      .select('status')
      .eq('phone_number', phone)
      .single();

    // Get recent template performance for this user
    const { data: recentTemplates } = await supabase
      .from('template_sends')
      .select('template_name, event_type, metadata')
      .eq('wa_id', phone)
      .order('sent_at', { ascending: false })
      .limit(5);

    return {
      contact,
      isDriver: !!driver,
      userType: driver ? 'driver' : (contact?.total_conversations > 5 ? 'returning' : 'new'),
      recentTemplates: recentTemplates || [],
      conversationCount: contact?.total_conversations || 0
    };
  } catch (error) {
    console.error('Error getting user context for fallback:', error);
    return {
      contact: null,
      isDriver: false,
      userType: 'new',
      recentTemplates: [],
      conversationCount: 0
    };
  }
}

function extractDomainFromTemplate(templateName: string): string {
  if (templateName.includes('payment')) return 'payment';
  if (templateName.includes('driver')) return 'driver';
  if (templateName.includes('property')) return 'property';
  if (templateName.includes('vehicle')) return 'vehicle';
  if (templateName.includes('passenger') || templateName.includes('ride')) return 'ride';
  if (templateName.includes('order') || templateName.includes('pharmacy')) return 'commerce';
  if (templateName.includes('support')) return 'support';
  return 'general';
}

function extractIntentFromTemplate(templateName: string): string {
  if (templateName.includes('quick')) return 'quick_action';
  if (templateName.includes('status')) return 'status_check';
  if (templateName.includes('confirmation')) return 'confirmation';
  if (templateName.includes('listing')) return 'listing';
  if (templateName.includes('search')) return 'search';
  return 'general';
}

async function getAlternativeInDomain(
  supabase: any,
  domain: string,
  originalTemplate: string,
  userContext: any
): Promise<FallbackResponse | null> {

  // Domain-specific alternative templates
  const alternatives: Record<string, string[]> = {
    payment: ['tpl_payments_quick_v1', 'tpl_payment_status_v1', 'tpl_payment_help_v1'],
    driver: ['tpl_driver_status_v1', 'tpl_driver_earnings_v1', 'tpl_driver_help_v1'],
    property: ['tpl_property_quick_v1', 'tpl_property_search_v1', 'tpl_property_help_v1'],
    vehicle: ['tpl_vehicle_quick_v1', 'tpl_vehicle_listing_v1', 'tpl_vehicle_help_v1'],
    ride: ['tpl_passenger_quick_v1', 'tpl_ride_booking_v1', 'tpl_ride_help_v1'],
    commerce: ['tpl_ordering_quick_v1', 'tpl_pharmacy_quick_v1', 'tpl_market_menu_v1'],
    support: ['tpl_support_quick_v1', 'tpl_escalation_v1', 'tpl_faq_v1']
  };

  const domainTemplates = alternatives[domain] || [];
  
  // Find first alternative that's not the original
  const alternative = domainTemplates.find(t => t !== originalTemplate);
  
  if (alternative) {
    // Check if this alternative has good performance
    try {
      const { data: performance } = await supabase
        .from('template_performance_metrics')
        .select('success_rate')
        .eq('template_name', alternative)
        .single();

      const confidence = performance?.success_rate ? Math.min(0.8, performance.success_rate) : 0.6;

      return {
        success: true,
        templateName: alternative,
        confidence,
        reasoning: `Alternative template in ${domain} domain`,
        isLastResort: false,
        metadata: {
          fallbackLevel: 'domain_alternative',
          originalTemplate,
          domain,
          performance: performance?.success_rate || 'unknown'
        }
      };
    } catch (error) {
      // No performance data available, use moderate confidence
      return {
        success: true,
        templateName: alternative,
        confidence: 0.6,
        reasoning: `Alternative template in ${domain} domain (no performance data)`,
        isLastResort: false,
        metadata: {
          fallbackLevel: 'domain_alternative',
          originalTemplate,
          domain
        }
      };
    }
  }

  return null;
}

async function getRelatedDomainTemplate(
  supabase: any,
  originalDomain: string,
  userContext: any
): Promise<FallbackResponse | null> {

  // Related domain mapping for cross-domain fallbacks
  const relatedDomains: Record<string, string[]> = {
    payment: ['support', 'general'],
    driver: ['ride', 'support'],
    property: ['support', 'general'],
    vehicle: ['support', 'general'],
    ride: ['driver', 'support'],
    commerce: ['support', 'general'],
    support: ['general']
  };

  const related = relatedDomains[originalDomain] || ['general'];
  
  // Select based on user context
  let targetDomain = related[0];
  if (userContext.isDriver && related.includes('driver')) {
    targetDomain = 'driver';
  }

  // Get template for related domain
  const relatedTemplateMap: Record<string, string> = {
    payment: 'tpl_payments_quick_v1',
    driver: 'tpl_driver_status_v1',
    property: 'tpl_property_quick_v1',
    vehicle: 'tpl_vehicle_quick_v1',
    ride: 'tpl_passenger_quick_v1',
    commerce: 'tpl_ordering_quick_v1',
    support: 'tpl_support_quick_v1',
    general: 'tpl_welcome_quick_v1'
  };

  const relatedTemplate = relatedTemplateMap[targetDomain];

  if (relatedTemplate) {
    return {
      success: true,
      templateName: relatedTemplate,
      confidence: 0.5,
      reasoning: `Related domain fallback: ${originalDomain} → ${targetDomain}`,
      isLastResort: false,
      metadata: {
        fallbackLevel: 'related_domain',
        originalDomain,
        targetDomain,
        userType: userContext.userType
      }
    };
  }

  return null;
}

async function getSafeGeneralTemplate(userContext: any, attemptCount: number): Promise<FallbackResponse> {
  // Safe templates that should always work
  const safeTemplates = [
    'tpl_welcome_quick_v1',
    'tpl_support_quick_v1',
    'tpl_main_menu_v1'
  ];

  // Select based on user context and attempt count
  let selectedTemplate = safeTemplates[0];
  
  if (userContext.isDriver && attemptCount < 4) {
    selectedTemplate = 'tpl_driver_status_v1';
  } else if (userContext.userType === 'new') {
    selectedTemplate = 'tpl_welcome_quick_v1';
  } else if (attemptCount >= 3) {
    selectedTemplate = 'tpl_support_quick_v1'; // Escalate to support
  }

  return {
    success: true,
    templateName: selectedTemplate,
    confidence: Math.max(0.3, 1.0 - (attemptCount * 0.2)), // Decreasing confidence
    reasoning: `Safe general template (attempt ${attemptCount})`,
    isLastResort: attemptCount >= 3,
    metadata: {
      fallbackLevel: attemptCount >= 3 ? 'last_resort' : 'safe_general',
      attemptCount,
      userType: userContext.userType,
      isDriver: userContext.isDriver
    }
  };
}

async function logTemplateFailure(
  supabase: any,
  templateName: string,
  failureReason: string,
  phone: string,
  context: any
) {
  try {
    await supabase
      .from('template_sends')
      .insert({
        wa_id: phone,
        template_name: templateName,
        event_type: 'failed',
        metadata: {
          failure_reason: failureReason,
          context: context,
          timestamp: new Date().toISOString()
        }
      });

    // Also log in execution log
    await supabase
      .from('agent_execution_log')
      .insert({
        user_id: phone,
        function_name: 'template-fallback-handler',
        input_data: {
          originalTemplate: templateName,
          failureReason,
          context
        },
        success_status: false,
        error_details: failureReason,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging template failure:', error);
  }
}

async function trackFallbackMetrics(
  supabase: any,
  originalTemplate: string,
  fallbackTemplate: string,
  failureReason: string
) {
  try {
    // Update template performance metrics
    const domain = extractDomainFromTemplate(originalTemplate);
    
    await supabase
      .from('template_performance_metrics')
      .upsert({
        template_name: originalTemplate,
        domain: domain,
        metric_type: 'fallback_rate',
        metric_value: 1,
        period_start: new Date().toISOString(),
        metadata: {
          fallback_template: fallbackTemplate,
          failure_reason: failureReason,
          updated_at: new Date().toISOString()
        }
      }, {
        onConflict: 'template_name,metric_type,period_start'
      });
  } catch (error) {
    console.error('Error tracking fallback metrics:', error);
  }
}