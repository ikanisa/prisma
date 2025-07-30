import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateRequest {
  action: 'get_template' | 'send_template' | 'create_template' | 'update_template' | 'sync_meta' | 'list';
  intent?: string;
  language?: string;
  template_data?: any;
  recipient_phone?: string;
  variables?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, intent, language = 'en', template_data, recipient_phone, variables } = await req.json() as TemplateRequest;

    console.log(`WhatsApp Templates Manager - Action: ${action}`, { intent, language });

    switch (action) {
      case 'get_template':
        return await getTemplate(supabase, intent!, language);
      
      case 'send_template':
        return await sendTemplate(supabase, template_data, recipient_phone!, variables);
      
      case 'create_template':
        return await createTemplate(supabase, template_data);
      
      case 'update_template':
        return await updateTemplate(supabase, template_data);
      
      case 'sync_meta':
        return await syncWithMeta(supabase);
      
      case 'list':
        return await listTemplates(supabase);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('WhatsApp Templates Manager Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getTemplate(supabase: any, intent: string, language: string) {
  console.log(`Getting template for intent: ${intent}, language: ${language}`);

  // First, try to find a template binding for this intent
  const { data: bindings, error: bindingError } = await supabase
    .from('whatsapp_template_bindings')
    .select(`
      *,
      template_version:whatsapp_template_versions(*),
      flow:whatsapp_flows(*),
      list:whatsapp_interactive_lists(*)
    `)
    .eq('intent_id', intent)
    .order('priority', { ascending: true })
    .limit(1);

  if (bindingError) {
    console.error('Error fetching template bindings:', bindingError);
    throw bindingError;
  }

  if (!bindings || bindings.length === 0) {
    // Fallback to default welcome template
    const { data: fallbackTemplate } = await supabase
      .from('whatsapp_template_versions')
      .select(`
        *,
        template:whatsapp_templates(*),
        components:whatsapp_template_components(*),
        buttons:whatsapp_template_buttons(*)
      `)
      .eq('language', language)
      .eq('status', 'APPROVED')
      .limit(1);

    return new Response(
      JSON.stringify({ 
        template: fallbackTemplate?.[0] || null,
        type: 'template',
        fallback_text: "Hello! How can I help you today?"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const binding = bindings[0];
  let result: any = { binding };

  // Get template version if exists
  if (binding.template_version_id) {
    const { data: template } = await supabase
      .from('whatsapp_template_versions')
      .select(`
        *,
        template:whatsapp_templates(*),
        components:whatsapp_template_components(*),
        buttons:whatsapp_template_buttons(*)
      `)
      .eq('id', binding.template_version_id)
      .eq('language', language)
      .eq('status', 'APPROVED')
      .single();

    if (template) {
      result.template = template;
      result.type = 'template';
    }
  }

  // Get flow if exists
  if (binding.flow_id) {
    const { data: flow } = await supabase
      .from('whatsapp_flows')
      .select(`
        *,
        steps:whatsapp_flow_steps(*, fields:whatsapp_flow_fields(*))
      `)
      .eq('id', binding.flow_id)
      .eq('status', 'APPROVED')
      .single();

    if (flow) {
      result.flow = flow;
      result.type = 'flow';
    }
  }

  // Get list if exists
  if (binding.list_id) {
    const { data: list } = await supabase
      .from('whatsapp_interactive_lists')
      .select('*')
      .eq('id', binding.list_id)
      .single();

    if (list) {
      result.list = list;
      result.type = 'list';
    }
  }

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendTemplate(supabase: any, templateData: any, recipientPhone: string, variables?: Record<string, string>) {
  console.log(`Sending template to ${recipientPhone}`, { templateData, variables });

  const startTime = Date.now();
  let success = true;
  let errorMessage = '';

  try {
    // Here you would integrate with WhatsApp Business Cloud API
    // For now, we'll just log the usage
    
    // Log template usage
    const usageData: any = {
      recipient_phone: recipientPhone,
      sent_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
      success,
      context: { variables, template_data: templateData }
    };

    if (templateData.template_version_id) {
      usageData.version_id = templateData.template_version_id;
    }
    if (templateData.flow_id) {
      usageData.flow_id = templateData.flow_id;
    }
    if (templateData.list_id) {
      usageData.list_id = templateData.list_id;
    }

    const { error: logError } = await supabase
      .from('whatsapp_template_usage_log')
      .insert(usageData);

    if (logError) {
      console.error('Error logging template usage:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: `msg_${Date.now()}`,
        latency_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    success = false;
    errorMessage = error.message;
    
    // Log failed usage
    await supabase
      .from('whatsapp_template_usage_log')
      .insert({
        recipient_phone: recipientPhone,
        sent_at: new Date().toISOString(),
        latency_ms: Date.now() - startTime,
        success: false,
        error_message: errorMessage,
        context: { variables, template_data: templateData }
      });

    throw error;
  }
}

async function createTemplate(supabase: any, templateData: any) {
  console.log('Creating new template:', templateData);

  // Create the base template
  const { data: template, error: templateError } = await supabase
    .from('whatsapp_templates')
    .insert({
      code: templateData.code,
      domain: templateData.domain,
      intent_ids: templateData.intent_ids || [],
      description: templateData.description,
      is_active: true
    })
    .select()
    .single();

  if (templateError) {
    throw templateError;
  }

  // Create template version
  const { data: version, error: versionError } = await supabase
    .from('whatsapp_template_versions')
    .insert({
      template_id: template.id,
      language: templateData.language || 'en',
      meta_name: templateData.meta_name,
      category: templateData.category || 'UTILITY',
      status: 'PENDING',
      sample_json: templateData.sample_json || {}
    })
    .select()
    .single();

  if (versionError) {
    throw versionError;
  }

  // Create components if provided
  if (templateData.components) {
    for (const component of templateData.components) {
      await supabase
        .from('whatsapp_template_components')
        .insert({
          version_id: version.id,
          component_type: component.type,
          text: component.text,
          format: component.format || 'TEXT',
          position: component.position || 1
        });
    }
  }

  // Create buttons if provided
  if (templateData.buttons) {
    for (const button of templateData.buttons) {
      await supabase
        .from('whatsapp_template_buttons')
        .insert({
          version_id: version.id,
          btn_type: button.type,
          text: button.text,
          url: button.url,
          phone_number: button.phone_number,
          payload_key: button.payload_key,
          position: button.position || 1
        });
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      template,
      version,
      message: 'Template created successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateTemplate(supabase: any, templateData: any) {
  console.log('Updating template:', templateData.id);

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .update({
      description: templateData.description,
      intent_ids: templateData.intent_ids,
      is_active: templateData.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateData.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      template: data,
      message: 'Template updated successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncWithMeta(supabase: any) {
  console.log('Syncing templates with Meta WhatsApp Business API');

  // Start sync job
  const { data: syncJob, error: jobError } = await supabase
    .from('whatsapp_template_sync_jobs')
    .insert({
      direction: 'PULL',
      payload: { action: 'sync_all_templates' },
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (jobError) {
    throw jobError;
  }

  try {
    // Here you would integrate with Meta's WhatsApp Business API
    // to pull the latest template statuses and update the database
    
    // For now, we'll simulate a successful sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update sync job as completed
    await supabase
      .from('whatsapp_template_sync_jobs')
      .update({
        finished_at: new Date().toISOString(),
        success: true
      })
      .eq('id', syncJob.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sync_job_id: syncJob.id,
        message: 'Sync completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Update sync job as failed
    await supabase
      .from('whatsapp_template_sync_jobs')
      .update({
        finished_at: new Date().toISOString(),
        success: false,
        error: error.message
      })
      .eq('id', syncJob.id);

    throw error;
  }
}

async function listTemplates(supabase: any) {
  console.log('Listing all templates');

  const { data: templates, error } = await supabase
    .from('whatsapp_templates')
    .select(`
      *,
      buttons:whatsapp_template_buttons(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      templates: templates || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}