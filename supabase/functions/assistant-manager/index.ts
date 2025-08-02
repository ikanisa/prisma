import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, config_id, assistant_data } = await req.json();

    console.log('Assistant manager action:', action);

    switch (action) {
      case 'create':
        return await createAssistant(assistant_data);
      
      case 'update':
        return await updateAssistant(config_id, assistant_data);
      
      case 'delete':
        return await deleteAssistant(config_id);
      
      case 'list':
        return await listAssistants();
      
      case 'sync_tools':
        return await syncTools(config_id);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Assistant manager error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createAssistant(assistantData: any) {
  const { name, instructions, model = 'gpt-4o', temperature = 0.4 } = assistantData;

  // Get active tools
  const { data: toolDefs } = await supabase
    .from('tool_definitions')
    .select('*')
    .eq('status', 'active');

  const tools = toolDefs?.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  })) || [];

  // Create OpenAI assistant
  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      name,
      model,
      instructions,
      tools,
      temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create OpenAI assistant: ${errorText}`);
  }

  const assistant = await response.json();

  // Store in database
  const { data: config } = await supabase
    .from('assistant_configs')
    .insert({
      assistant_id: assistant.id,
      name,
      model,
      instructions,
      tools: tools,
      temperature,
      status: 'active'
    })
    .select()
    .single();

  console.log('Assistant created:', assistant.id);

  return new Response(JSON.stringify({
    success: true,
    assistant_id: assistant.id,
    config_id: config?.id,
    config
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateAssistant(configId: string, assistantData: any) {
  // Get current config
  const { data: currentConfig } = await supabase
    .from('assistant_configs')
    .select('*')
    .eq('id', configId)
    .single();

  if (!currentConfig) {
    throw new Error('Assistant configuration not found');
  }

  const { name, instructions, model, temperature } = assistantData;

  // Get active tools
  const { data: toolDefs } = await supabase
    .from('tool_definitions')
    .select('*')
    .eq('status', 'active');

  const tools = toolDefs?.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  })) || [];

  // Update OpenAI assistant
  const response = await fetch(`https://api.openai.com/v1/assistants/${currentConfig.assistant_id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      name: name || currentConfig.name,
      instructions: instructions || currentConfig.instructions,
      model: model || currentConfig.model,
      tools,
      temperature: temperature !== undefined ? temperature : currentConfig.temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update OpenAI assistant: ${errorText}`);
  }

  // Update database
  const { data: updatedConfig } = await supabase
    .from('assistant_configs')
    .update({
      name: name || currentConfig.name,
      instructions: instructions || currentConfig.instructions,
      model: model || currentConfig.model,
      tools,
      temperature: temperature !== undefined ? temperature : currentConfig.temperature,
      updated_at: new Date().toISOString()
    })
    .eq('id', configId)
    .select()
    .single();

  console.log('Assistant updated:', currentConfig.assistant_id);

  return new Response(JSON.stringify({
    success: true,
    config: updatedConfig
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function deleteAssistant(configId: string) {
  // Get config
  const { data: config } = await supabase
    .from('assistant_configs')
    .select('*')
    .eq('id', configId)
    .single();

  if (!config) {
    throw new Error('Assistant configuration not found');
  }

  // Delete from OpenAI
  if (config.assistant_id) {
    const response = await fetch(`https://api.openai.com/v1/assistants/${config.assistant_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      console.warn('Failed to delete OpenAI assistant, continuing with database cleanup');
    }
  }

  // Delete from database
  await supabase
    .from('assistant_configs')
    .delete()
    .eq('id', configId);

  console.log('Assistant deleted:', config.assistant_id);

  return new Response(JSON.stringify({
    success: true,
    message: 'Assistant deleted successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function listAssistants() {
  const { data: configs } = await supabase
    .from('assistant_configs')
    .select('*')
    .order('created_at', { ascending: false });

  return new Response(JSON.stringify({
    assistants: configs || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function syncTools(configId: string) {
  // Get config
  const { data: config } = await supabase
    .from('assistant_configs')
    .select('*')
    .eq('id', configId)
    .single();

  if (!config) {
    throw new Error('Assistant configuration not found');
  }

  // Get current active tools
  const { data: toolDefs } = await supabase
    .from('tool_definitions')
    .select('*')
    .eq('status', 'active');

  const tools = toolDefs?.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  })) || [];

  // Update OpenAI assistant with new tools
  const response = await fetch(`https://api.openai.com/v1/assistants/${config.assistant_id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      tools
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to sync tools: ${errorText}`);
  }

  // Update database
  await supabase
    .from('assistant_configs')
    .update({
      tools,
      updated_at: new Date().toISOString()
    })
    .eq('id', configId);

  console.log('Tools synced for assistant:', config.assistant_id);

  return new Response(JSON.stringify({
    success: true,
    tools_count: tools.length,
    message: 'Tools synchronized successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}