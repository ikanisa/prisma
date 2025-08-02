import { supabaseClient } from "./client.ts";
// Human Handoff - manages escalation to human agents
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, conversation_id, phone_number, reason, agent_id } = await req.json();

    if (action === 'request') {
      return await requestHandoff(conversation_id, phone_number, reason);
    } else if (action === 'claim') {
      return await claimHandoff(conversation_id, agent_id);
    } else if (action === 'resolve') {
      return await resolveHandoff(conversation_id, agent_id);
    } else if (action === 'list') {
      return await listHandoffs();
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Human handoff error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function requestHandoff(conversation_id: string, phone_number: string, reason: string) {
  console.log(`👋 Handoff requested for conversation ${conversation_id}`);

  // Update conversation
  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      handoff_requested: true,
      handoff_at: new Date().toISOString(),
      handoff_reason: reason
    })
    .eq('id', conversation_id);

  if (updateError) {
    throw updateError;
  }

  // Get i18n message for user
  const { data: i18nMessage } = await supabase
    .from('i18n_messages')
    .select('message_text')
    .eq('message_key', 'handoff_requested')
    .eq('language_code', 'en')
    .single();

  // Queue response to user
  await supabase
    .from('outbound_queue')
    .insert({
      phone_number,
      message_text: i18nMessage?.message_text || '👋 A human agent will help you shortly. Please wait.',
      channel: 'whatsapp',
      priority: 8
    });

  // Record metric
  await supabase
    .from('system_metrics')
    .insert({
      metric_name: 'handoff_requested',
      metric_value: 1,
      metric_type: 'counter',
      tags: { reason, conversation_id }
    });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function claimHandoff(conversation_id: string, agent_id: string) {
  console.log(`🎯 Agent ${agent_id} claiming handoff for conversation ${conversation_id}`);

  const { error } = await supabase
    .from('conversations')
    .update({
      assigned_agent_id: agent_id
    })
    .eq('id', conversation_id)
    .eq('handoff_requested', true)
    .is('assigned_agent_id', null);

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function resolveHandoff(conversation_id: string, agent_id: string) {
  console.log(`✅ Resolving handoff for conversation ${conversation_id}`);

  const { error } = await supabase
    .from('conversations')
    .update({
      handoff_requested: false,
      resolved_at: new Date().toISOString()
    })
    .eq('id', conversation_id)
    .eq('assigned_agent_id', agent_id);

  if (error) {
    throw error;
  }

  // Record resolution metric
  await supabase
    .from('system_metrics')
    .insert({
      metric_name: 'handoff_resolved',
      metric_value: 1,
      metric_type: 'counter',
      tags: { agent_id, conversation_id }
    });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function listHandoffs() {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      contact_id,
      handoff_at,
      handoff_reason,
      assigned_agent_id,
      status
    `)
    .eq('handoff_requested', true)
    .is('resolved_at', null)
    .order('handoff_at', { ascending: true });

  if (error) {
    throw error;
  }

  return new Response(JSON.stringify({ handoffs: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}