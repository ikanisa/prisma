
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { from, text, message_id } = await req.json();

    // Simple AI fallback response for unmatched messages
    let response = "I understand you're trying to use easyMO! 🚀\n\n";

    if (text.toLowerCase().includes('help')) {
      response += "Here's what I can help with:\n";
      response += "🚗 Post a trip: 'Trip: Kigali → Huye 2 seats 3000'\n";
      response += "🚌 Find a ride: 'Need ride Kigali → Musanze 1 seat'\n";
      response += "💰 Make payment: Just send an amount like '5000'\n";
      response += "🛒 Browse products: Send 'browse'\n";
      response += "🎉 Find events: Send 'events'\n";
    } else {
      response += "I didn't quite understand that. Try:\n";
      response += "• 'help' for assistance\n";
      response += "• Post a trip with format: 'Trip: [from] → [to] [seats] [price]'\n";
      response += "• Find a ride: 'Need ride [from] → [to] [seats]'\n";
    }

    // Send response via channel gateway
    await supabase.functions.invoke("channel-gateway", {
      body: {
        channel: "whatsapp",
        recipient: from,
        message: response,
        message_type: "text",
      },
    });

    return new Response(
      JSON.stringify({ handled: true, response }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('MCP Orchestrator error:', error);
    return new Response(
      JSON.stringify({ handled: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
