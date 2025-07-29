import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateRequest {
  action: 'list' | 'get' | 'send' | 'create' | 'update' | 'delete';
  template_id?: string;
  intent?: string;
  language?: string;
  recipient_phone?: string;
  variables?: Record<string, string>;
  template_data?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, template_id, intent, language, recipient_phone, variables, template_data } = await req.json() as TemplateRequest;

    console.log(`Processing WhatsApp templates action: ${action}`);

    switch (action) {
      case 'list':
        return await listTemplates(supabase, intent, language);
      
      case 'get':
        return await getTemplate(supabase, template_id!, language);
      
      case 'send':
        return await sendTemplate(supabase, template_id!, recipient_phone!, variables || {});
      
      case 'create':
        return await createTemplate(supabase, template_data);
      
      case 'update':
        return await updateTemplate(supabase, template_id!, template_data);
      
      case 'delete':
        return await deleteTemplate(supabase, template_id!);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in WhatsApp templates manager:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function listTemplates(supabase: any, intent?: string, language?: string) {
  let query = supabase
    .from('whatsapp_templates')
    .select(`
      id,
      code,
      domain,
      intent_ids,
      description,
      is_active,
      ab_group,
      created_at,
      whatsapp_template_versions (
        id,
        language,
        meta_name,
        category,
        status,
        created_at,
        whatsapp_template_components (
          component_type,
          text,
          format,
          position
        ),
        whatsapp_template_buttons (
          btn_type,
          text,
          url,
          payload_key,
          position
        )
      )
    `)
    .eq('is_active', true);

  if (intent) {
    query = query.contains('intent_ids', [intent]);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Filter by language if specified
  let filteredData = data;
  if (language) {
    filteredData = data.map(template => ({
      ...template,
      whatsapp_template_versions: template.whatsapp_template_versions.filter(
        (version: any) => version.language === language
      )
    })).filter(template => template.whatsapp_template_versions.length > 0);
  }

  return new Response(JSON.stringify({ 
    templates: filteredData,
    count: filteredData.length 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getTemplate(supabase: any, template_id: string, language?: string) {
  let query = supabase
    .from('whatsapp_templates')
    .select(`
      *,
      whatsapp_template_versions!inner (
        *,
        whatsapp_template_components (*),
        whatsapp_template_buttons (*)
      )
    `)
    .eq('id', template_id);

  if (language) {
    query = query.eq('whatsapp_template_versions.language', language);
  }

  const { data, error } = await query.single();

  if (error) throw error;

  return new Response(JSON.stringify({ template: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function sendTemplate(supabase: any, template_id: string, recipient_phone: string, variables: Record<string, string>) {
  const startTime = Date.now();

  try {
    // Get best template version
    const { data: template } = await supabase
      .from('whatsapp_template_versions')
      .select(`
        *,
        whatsapp_templates (*),
        whatsapp_template_components (*),
        whatsapp_template_buttons (*)
      `)
      .eq('template_id', template_id)
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!template) {
      throw new Error('No approved template version found');
    }

    // Build message content with variables
    const messageContent = buildMessageContent(template, variables);

    // Send via WhatsApp API (mock for now)
    const messageId = `msg_${Date.now()}`;
    const success = true; // Mock success

    // Log usage
    await supabase
      .from('whatsapp_template_usage_log')
      .insert({
        version_id: template.id,
        recipient_phone,
        message_id: messageId,
        latency_ms: Date.now() - startTime,
        success,
        context: { variables, intent: template.whatsapp_templates.intent_ids }
      });

    return new Response(JSON.stringify({ 
      success,
      message_id: messageId,
      content: messageContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Log failed usage
    await supabase
      .from('whatsapp_template_usage_log')
      .insert({
        version_id: null,
        recipient_phone,
        message_id: null,
        latency_ms: Date.now() - startTime,
        success: false,
        error_message: error.message,
        context: { variables, template_id }
      });

    throw error;
  }
}

async function createTemplate(supabase: any, template_data: any) {
  const { template, version, components, buttons } = template_data;

  // Create template
  const { data: newTemplate, error: templateError } = await supabase
    .from('whatsapp_templates')
    .insert(template)
    .select()
    .single();

  if (templateError) throw templateError;

  // Create version
  const { data: newVersion, error: versionError } = await supabase
    .from('whatsapp_template_versions')
    .insert({ ...version, template_id: newTemplate.id })
    .select()
    .single();

  if (versionError) throw versionError;

  // Create components
  if (components?.length > 0) {
    const { error: componentsError } = await supabase
      .from('whatsapp_template_components')
      .insert(components.map((comp: any) => ({ ...comp, version_id: newVersion.id })));

    if (componentsError) throw componentsError;
  }

  // Create buttons
  if (buttons?.length > 0) {
    const { error: buttonsError } = await supabase
      .from('whatsapp_template_buttons')
      .insert(buttons.map((btn: any) => ({ ...btn, version_id: newVersion.id })));

    if (buttonsError) throw buttonsError;
  }

  return new Response(JSON.stringify({ 
    template: newTemplate,
    version: newVersion 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateTemplate(supabase: any, template_id: string, template_data: any) {
  const { template, version, components, buttons } = template_data;

  // Update template
  if (template) {
    const { error: templateError } = await supabase
      .from('whatsapp_templates')
      .update(template)
      .eq('id', template_id);

    if (templateError) throw templateError;
  }

  // Handle version updates (create new version for changes)
  if (version) {
    const { data: newVersion, error: versionError } = await supabase
      .from('whatsapp_template_versions')
      .insert({ ...version, template_id })
      .select()
      .single();

    if (versionError) throw versionError;

    // Create new components and buttons for new version
    if (components?.length > 0) {
      await supabase
        .from('whatsapp_template_components')
        .insert(components.map((comp: any) => ({ ...comp, version_id: newVersion.id })));
    }

    if (buttons?.length > 0) {
      await supabase
        .from('whatsapp_template_buttons')
        .insert(buttons.map((btn: any) => ({ ...btn, version_id: newVersion.id })));
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function deleteTemplate(supabase: any, template_id: string) {
  const { error } = await supabase
    .from('whatsapp_templates')
    .update({ is_active: false })
    .eq('id', template_id);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function buildMessageContent(template: any, variables: Record<string, string>) {
  const components = template.whatsapp_template_components || [];
  const buttons = template.whatsapp_template_buttons || [];

  let content = '';
  
  components
    .sort((a: any, b: any) => a.position - b.position)
    .forEach((comp: any) => {
      if (comp.text) {
        let text = comp.text;
        // Replace variables
        Object.entries(variables).forEach(([key, value]) => {
          text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });
        content += text + '\n';
      }
    });

  // Add buttons as text for now
  if (buttons.length > 0) {
    content += '\nOptions:\n';
    buttons
      .sort((a: any, b: any) => a.position - b.position)
      .forEach((btn: any, index: number) => {
        content += `${index + 1}. ${btn.text}\n`;
      });
  }

  return content.trim();
}

// Helper function to get best template for intent
export async function getBestTemplateForIntent(supabase: any, intent: string, language: string = 'en') {
  const { data } = await supabase
    .from('whatsapp_template_bindings')
    .select(`
      *,
      whatsapp_template_versions!inner (
        *,
        whatsapp_templates (*),
        whatsapp_template_components (*),
        whatsapp_template_buttons (*)
      )
    `)
    .eq('intent_id', intent)
    .eq('whatsapp_template_versions.language', language)
    .eq('whatsapp_template_versions.status', 'APPROVED')
    .order('priority', { ascending: true })
    .limit(1);

  return data?.[0] || null;
}