import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ButtonTemplate {
  id: string;
  title: string;
  action_type: string;
  context_tags: string[];
  priority: number;
  template_data: any;
}

interface GenerateButtonsRequest {
  domain: string;
  intent: string;
  user_context: any;
  conversation_state: any;
  max_buttons?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { domain, intent, user_context, conversation_state, max_buttons = 3 } = await req.json() as GenerateButtonsRequest;

    console.log('Generating buttons for:', { domain, intent, max_buttons });

    // Fetch relevant action buttons based on domain and context
    const { data: buttons, error } = await supabase
      .from('whatsapp_action_buttons')
      .select('*')
      .eq('domain', domain)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch buttons: ${error.message}`);
    }

    // Filter buttons based on intent and context
    const relevantButtons = filterButtonsByContext(buttons || [], intent, user_context, conversation_state);
    
    // Limit to max_buttons
    const selectedButtons = relevantButtons.slice(0, max_buttons);

    // Render buttons with user context
    const renderedButtons = await renderButtonsWithContext(selectedButtons, user_context, supabase);

    // Log template usage
    await logTemplateUsage(supabase, domain, intent, selectedButtons.length, user_context.phone);

    return new Response(JSON.stringify({
      success: true,
      buttons: renderedButtons,
      total_available: relevantButtons.length,
      selected_count: selectedButtons.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in template-button-generator:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function filterButtonsByContext(
  buttons: ButtonTemplate[], 
  intent: string, 
  userContext: any, 
  conversationState: any
): ButtonTemplate[] {
  return buttons.filter(button => {
    // Check if button matches current intent
    const intentMatch = button.context_tags.includes(intent) || 
                       button.context_tags.includes('general') ||
                       button.context_tags.length === 0;

    // Check user context relevance
    const contextMatch = checkContextRelevance(button, userContext, conversationState);

    return intentMatch && contextMatch;
  }).sort((a, b) => b.priority - a.priority);
}

function checkContextRelevance(button: ButtonTemplate, userContext: any, conversationState: any): boolean {
  const contextTags = button.context_tags;
  
  // Always show high-priority universal buttons
  if (button.priority >= 9 && contextTags.includes('universal')) {
    return true;
  }

  // Check for payment-specific context
  if (contextTags.includes('payment') && userContext.hasWallet) {
    return true;
  }

  // Check for location-based buttons
  if (contextTags.includes('location') && userContext.location) {
    return true;
  }

  // Check for repeat customer buttons
  if (contextTags.includes('returning') && userContext.isReturning) {
    return true;
  }

  // Check conversation state
  if (contextTags.includes('in_transaction') && conversationState.activeTransaction) {
    return true;
  }

  // Default relevance for general buttons
  return contextTags.includes('general') || contextTags.length === 0;
}

async function renderButtonsWithContext(
  buttons: ButtonTemplate[], 
  userContext: any, 
  supabase: any
): Promise<any[]> {
  const renderedButtons = [];

  for (const button of buttons) {
    try {
      let title = button.title;
      let templateData = button.template_data;

      // Replace placeholders with user context
      if (userContext.name) {
        title = title.replace(/\{name\}/g, userContext.name);
      }
      if (userContext.balance) {
        title = title.replace(/\{balance\}/g, userContext.balance.toString());
      }
      if (userContext.location) {
        title = title.replace(/\{location\}/g, userContext.location);
      }

      // Handle dynamic template data
      if (templateData) {
        templateData = await processTemplateData(templateData, userContext, supabase);
      }

      renderedButtons.push({
        id: button.id,
        title: title,
        action_type: button.action_type,
        template_data: templateData,
        priority: button.priority
      });

    } catch (error) {
      console.error(`Error rendering button ${button.id}:`, error);
      // Include button with original title as fallback
      renderedButtons.push({
        id: button.id,
        title: button.title,
        action_type: button.action_type,
        template_data: button.template_data,
        priority: button.priority
      });
    }
  }

  return renderedButtons;
}

async function processTemplateData(templateData: any, userContext: any, supabase: any): Promise<any> {
  // Handle dynamic data fetching for templates
  if (templateData.fetch_user_data) {
    // Fetch additional user data if needed
    const { data: userData } = await supabase
      .from('users')
      .select('credits, recent_transactions')
      .eq('phone', userContext.phone)
      .single();

    if (userData) {
      templateData.user_credits = userData.credits;
      templateData.recent_transactions = userData.recent_transactions;
    }
  }

  if (templateData.fetch_nearby_locations && userContext.location) {
    // Fetch nearby businesses or locations
    const { data: locations } = await supabase
      .from('canonical_locations')
      .select('name, category')
      .limit(5);

    templateData.nearby_locations = locations || [];
  }

  return templateData;
}

async function logTemplateUsage(
  supabase: any, 
  domain: string, 
  intent: string, 
  buttonCount: number, 
  userPhone: string
): Promise<void> {
  try {
    await supabase
      .from('template_usage_logs')
      .insert({
        domain,
        intent,
        button_count: buttonCount,
        user_phone: userPhone,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log template usage:', error);
  }
}