import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_ID');

    if (!accessToken || !phoneNumberId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing WhatsApp credentials',
        details: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_ID not configured'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const testUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}?fields=id,display_phone_number&access_token=${accessToken}`;
    
    console.log('Testing WhatsApp permissions for phone ID:', phoneNumberId);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const responseData = await response.json();
    
    console.log('WhatsApp API Response:', JSON.stringify(responseData, null, 2));

    return new Response(JSON.stringify({
      success: response.ok,
      statusCode: response.status,
      data: responseData,
      url: testUrl.replace(accessToken, '[REDACTED]'),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('WhatsApp permission test error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Network or API error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});