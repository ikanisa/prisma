import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateLibraryRequest {
  action: 'create' | 'update' | 'list' | 'delete' | 'bulk_import';
  template_data?: any;
  filters?: any;
  templates?: any[];
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, template_data, filters, templates } = await req.json() as TemplateLibraryRequest;

    console.log('Template library action:', action);

    let result;

    switch (action) {
      case 'create':
        result = await createTemplate(supabase, template_data);
        break;
      case 'update':
        result = await updateTemplate(supabase, template_data);
        break;
      case 'list':
        result = await listTemplates(supabase, filters);
        break;
      case 'delete':
        result = await deleteTemplate(supabase, template_data.id);
        break;
      case 'bulk_import':
        result = await bulkImportTemplates(supabase, templates);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in template-library-manager:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createTemplate(supabase: any, templateData: any) {
  // Validate required fields
  const required = ['name', 'domain', 'content', 'language'];
  for (const field of required) {
    if (!templateData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Set defaults
  const template = {
    ...templateData,
    template_type: templateData.template_type || 'text',
    is_active: templateData.is_active !== false,
    priority: templateData.priority || 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`);
  }

  // Create associated buttons if provided
  if (templateData.buttons && templateData.buttons.length > 0) {
    await createTemplateButtons(supabase, data.id, templateData.buttons);
  }

  return data;
}

async function updateTemplate(supabase: any, templateData: any) {
  if (!templateData.id) {
    throw new Error('Template ID is required for update');
  }

  const updateData = {
    ...templateData,
    updated_at: new Date().toISOString()
  };

  delete updateData.id; // Don't update the ID

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .update(updateData)
    .eq('id', templateData.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }

  // Update buttons if provided
  if (templateData.buttons) {
    await updateTemplateButtons(supabase, templateData.id, templateData.buttons);
  }

  return data;
}

async function listTemplates(supabase: any, filters: any = {}) {
  let query = supabase
    .from('whatsapp_templates')
    .select(`
      *,
      template_buttons:whatsapp_template_buttons(*)
    `);

  // Apply filters
  if (filters.domain) {
    query = query.eq('domain', filters.domain);
  }
  if (filters.language) {
    query = query.eq('language', filters.language);
  }
  if (filters.template_type) {
    query = query.eq('template_type', filters.template_type);
  }
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  // Add search functionality
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%, content.ilike.%${filters.search}%`);
  }

  // Add sorting
  const sortBy = filters.sort_by || 'updated_at';
  const sortOrder = filters.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Add pagination
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list templates: ${error.message}`);
  }

  return {
    templates: data,
    total: data?.length || 0
  };
}

async function deleteTemplate(supabase: any, templateId: string) {
  if (!templateId) {
    throw new Error('Template ID is required for deletion');
  }

  // First delete associated buttons
  await supabase
    .from('whatsapp_template_buttons')
    .delete()
    .eq('template_id', templateId);

  // Then delete the template
  const { error } = await supabase
    .from('whatsapp_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`);
  }

  return { deleted: true, template_id: templateId };
}

async function bulkImportTemplates(supabase: any, templates: any[]) {
  if (!templates || templates.length === 0) {
    throw new Error('No templates provided for bulk import');
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < templates.length; i++) {
    try {
      const template = templates[i];
      const result = await createTemplate(supabase, template);
      results.push(result);
    } catch (error) {
      errors.push({
        index: i,
        template: templates[i]?.name || 'Unknown',
        error: error.message
      });
    }
  }

  return {
    imported: results.length,
    failed: errors.length,
    total: templates.length,
    results,
    errors
  };
}

async function createTemplateButtons(supabase: any, templateId: string, buttons: any[]) {
  const buttonData = buttons.map((button, index) => ({
    template_id: templateId,
    button_text: button.text || button.button_text,
    button_type: button.type || button.button_type || 'reply',
    payload: button.payload || {},
    button_order: button.order || index + 1,
    is_active: button.is_active !== false
  }));

  const { error } = await supabase
    .from('whatsapp_template_buttons')
    .insert(buttonData);

  if (error) {
    throw new Error(`Failed to create template buttons: ${error.message}`);
  }
}

async function updateTemplateButtons(supabase: any, templateId: string, buttons: any[]) {
  // Delete existing buttons
  await supabase
    .from('whatsapp_template_buttons')
    .delete()
    .eq('template_id', templateId);

  // Create new buttons
  if (buttons.length > 0) {
    await createTemplateButtons(supabase, templateId, buttons);
  }
}