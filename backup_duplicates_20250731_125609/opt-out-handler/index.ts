// Opt-out Handler - processes STOP/UNSUBSCRIBE keywords for compliance
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const supabase = createClient(
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
    const { phone_number, message_text, action } = await req.json();
    
    if (action === 'opt_out' || /\b(stop|unsubscribe|unsub|quit)\b/i.test(message_text)) {
      return await handleOptOut(phone_number);
    } else if (action === 'opt_in' || /\b(start|subscribe|join)\b/i.test(message_text)) {
      return await handleOptIn(phone_number);
    }

    return new Response(JSON.stringify({ action: 'none' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Opt-out handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleOptOut(phone_number: string) {
  console.log(`🚫 Processing opt-out for ${phone_number}`);

  // Update contact limits
  await supabase
    .from('contact_limits')
    .upsert({
      phone_number,
      is_opted_out: true,
      opt_out_reason: 'User requested',
      opt_out_at: new Date().toISOString()
    });

  // Get i18n confirmation message
  const { data: i18nMessage } = await supabase
    .from('i18n_messages')
    .select('message_text')
    .eq('message_key', 'opt_out_confirmation')
    .eq('language_code', 'en')
    .single();

  // Queue confirmation message
  await supabase
    .from('outbound_queue')
    .insert({
      phone_number,
      message_text: i18nMessage?.message_text || 'You have been unsubscribed. Reply START to resubscribe.',
      channel: 'whatsapp',
      priority: 10
    });

  return new Response(JSON.stringify({ success: true, action: 'opted_out' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleOptIn(phone_number: string) {
  console.log(`✅ Processing opt-in for ${phone_number}`);

  await supabase
    .from('contact_limits')
    .upsert({
      phone_number,
      is_opted_out: false,
      opt_out_reason: null,
      opt_out_at: null
    });

  return new Response(JSON.stringify({ success: true, action: 'opted_in' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}