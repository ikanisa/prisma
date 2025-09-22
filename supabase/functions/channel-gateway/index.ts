import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// SECURITY FIX: Environment validation and improved CORS
function validateChannelGatewayEnv() {
  const requiredKeys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = requiredKeys.filter(key => !Deno.env.get(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateChannelGatewayEnv();

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(withErrorHandling(async (req) => {
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
        console.error('WhatsApp credentials not configured');
        throw new Error('WhatsApp credentials not configured');
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
