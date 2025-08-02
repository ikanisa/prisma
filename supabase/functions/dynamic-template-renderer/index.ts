import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RenderRequest {
  template_id: string;
  user_context: any;
  variables: Record<string, any>;
  language?: string;
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { template_id, user_context, variables, language = 'en' } = await req.json() as RenderRequest;

    console.log('Rendering template:', { template_id, language });

    // Fetch template from database
    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', template_id)
      .eq('language', language)
      .single();

    if (error || !template) {
      throw new Error(`Template not found: ${template_id} for language: ${language}`);
    }

    // Render template with context and variables
    const renderedTemplate = await renderTemplate(template, user_context, variables, supabase);

    // Log template usage
    await logTemplateRendering(supabase, template_id, language, user_context.phone || 'unknown');

    return new Response(JSON.stringify({
      success: true,
      rendered_template: renderedTemplate,
      template_id,
      language
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dynamic-template-renderer:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function renderTemplate(
  template: any, 
  userContext: any, 
  variables: Record<string, any>,
  supabase: any
): Promise<any> {
  let content = template.content;
  let buttons = template.buttons || [];

  // Replace user context variables
  const contextVars = {
    ...userContext,
    ...variables,
    timestamp: new Date().toLocaleString('en-RW'),
    date: new Date().toLocaleDateString('en-RW'),
    time: new Date().toLocaleTimeString('en-RW')
  };

  // Replace placeholders in content
  for (const [key, value] of Object.entries(contextVars)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    content = content.replace(placeholder, String(value || ''));
  }

  // Process dynamic content based on template type
  if (template.template_type === 'interactive') {
    content = await processDynamicContent(content, userContext, supabase);
    buttons = await processDynamicButtons(buttons, userContext, supabase);
  }

  // Handle flow templates
  if (template.template_type === 'flow') {
    return {
      type: 'flow',
      flow_id: template.flow_id,
      flow_token: template.flow_token,
      content,
      buttons
    };
  }

  // Handle list templates
  if (template.template_type === 'list') {
    const listItems = await generateListItems(template, userContext, supabase);
    return {
      type: 'list',
      content,
      list_items: listItems,
      buttons
    };
  }

  // Standard template
  return {
    type: template.template_type || 'text',
    content,
    buttons,
    media_url: template.media_url
  };
}

async function processDynamicContent(content: string, userContext: any, supabase: any): Promise<string> {
  // Handle dynamic content blocks
  if (content.includes('{recent_transactions}')) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, description, created_at')
      .eq('user_phone', userContext.phone)
      .order('created_at', { ascending: false })
      .limit(3);

    if (transactions && transactions.length > 0) {
      const transactionText = transactions
        .map(t => `• ${t.description}: ${t.amount} RWF`)
        .join('\n');
      content = content.replace('{recent_transactions}', transactionText);
    } else {
      content = content.replace('{recent_transactions}', 'No recent transactions');
    }
  }

  if (content.includes('{nearby_businesses}')) {
    const { data: businesses } = await supabase
      .from('businesses')
      .select('name, category')
      .eq('status', 'active')
      .limit(5);

    if (businesses && businesses.length > 0) {
      const businessText = businesses
        .map(b => `• ${b.name} (${b.category})`)
        .join('\n');
      content = content.replace('{nearby_businesses}', businessText);
    } else {
      content = content.replace('{nearby_businesses}', 'No nearby businesses found');
    }
  }

  if (content.includes('{current_weather}')) {
    // Placeholder for weather integration
    content = content.replace('{current_weather}', 'Sunny, 24°C');
  }

  return content;
}

async function processDynamicButtons(buttons: any[], userContext: any, supabase: any): Promise<any[]> {
  const processedButtons = [];

  for (const button of buttons) {
    let buttonText = button.text;
    let buttonPayload = button.payload;

    // Replace placeholders in button text
    if (userContext.name) {
      buttonText = buttonText.replace(/\{name\}/g, userContext.name);
    }
    if (userContext.balance) {
      buttonText = buttonText.replace(/\{balance\}/g, userContext.balance.toString());
    }

    // Add dynamic button data
    if (button.dynamic_data) {
      const dynamicData = await fetchDynamicButtonData(button.dynamic_data, userContext, supabase);
      buttonPayload = { ...buttonPayload, ...dynamicData };
    }

    processedButtons.push({
      ...button,
      text: buttonText,
      payload: buttonPayload
    });
  }

  return processedButtons;
}

async function generateListItems(template: any, userContext: any, supabase: any): Promise<any[]> {
  const listItems = [];

  if (template.list_type === 'nearby_businesses') {
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, category, rating')
      .eq('status', 'active')
      .limit(10);

    for (const business of businesses || []) {
      listItems.push({
        id: business.id,
        title: business.name,
        description: `${business.category} • ⭐ ${business.rating || 'New'}`,
        payload: { action: 'view_business', business_id: business.id }
      });
    }
  }

  if (template.list_type === 'recent_orders') {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, business_name, total, status, created_at')
      .eq('customer_phone', userContext.phone)
      .order('created_at', { ascending: false })
      .limit(10);

    for (const order of orders || []) {
      listItems.push({
        id: order.id,
        title: `Order from ${order.business_name}`,
        description: `${order.total} RWF • ${order.status} • ${new Date(order.created_at).toLocaleDateString()}`,
        payload: { action: 'view_order', order_id: order.id }
      });
    }
  }

  return listItems;
}

async function fetchDynamicButtonData(dynamicConfig: any, userContext: any, supabase: any): Promise<any> {
  const data: any = {};

  if (dynamicConfig.fetch_balance) {
    const { data: user } = await supabase
      .from('users')
      .select('credits')
      .eq('phone', userContext.phone)
      .single();

    data.current_balance = user?.credits || 0;
  }

  if (dynamicConfig.fetch_location) {
    data.user_location = userContext.location || 'Unknown';
  }

  return data;
}

async function logTemplateRendering(
  supabase: any, 
  templateId: string, 
  language: string, 
  userPhone: string
): Promise<void> {
  try {
    await supabase
      .from('template_rendering_logs')
      .insert({
        template_id: templateId,
        language,
        user_phone: userPhone,
        rendered_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log template rendering:', error);
  }
}