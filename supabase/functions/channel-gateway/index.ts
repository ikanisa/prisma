
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      channel = 'whatsapp', 
      recipient, 
      message, 
      message_type = 'text'
    } = await req.json();

    if (!recipient || !message) {
      throw new Error('Recipient and message are required');
    }

    console.log(`Channel gateway: ${channel} message to ${recipient}`);

    if (channel === 'whatsapp') {
      // Send WhatsApp message via Meta API
      const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
      const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

      if (!phoneId || !accessToken) {
        console.warn('WhatsApp credentials not configured, logging message instead');
        console.log(`Would send to ${recipient}: ${message}`);
        return new Response(JSON.stringify({
          success: true,
          simulated: true,
          recipient,
          channel
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'text',
          text: { body: message }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('WhatsApp send failed:', error);
        throw new Error(`WhatsApp API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('WhatsApp message sent:', result);
    }

    return new Response(JSON.stringify({
      success: true,
      recipient,
      channel
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Channel gateway error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
