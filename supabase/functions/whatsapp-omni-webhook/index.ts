import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'easymo_verify';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    // Webhook verification
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { headers: corsHeaders });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      
      // Process incoming WhatsApp message
      if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
        const message = body.entry[0].changes[0].value.messages[0];
        const phone = message.from;
        const messageText = message.text?.body || message.interactive?.button_reply?.title || '';
        
        console.log('📱 WhatsApp message received', { phone, messageLength: messageText.length });
        
        // Route to omni-agent
        const agentResponse = await routeToOmniAgent(messageText, phone);
        
        if (agentResponse.success) {
          await sendWhatsAppResponse(phone, agentResponse);
        } else {
          await sendWhatsAppMessage(phone, "Sorry, I'm having trouble right now. Please try again later.");
        }
        
        return new Response(JSON.stringify({ status: 'processed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Webhook error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

/**
 * Route to omni-agent (DISABLED - Preventing duplicate processing)
 * This function is disabled to prevent duplicate message processing.
 * All routing now goes through whatsapp-webhook -> omni-agent-enhanced
 */
async function routeToOmniAgent(message: string, phone: string): Promise<any> {
  console.log('⚠️ whatsapp-omni-webhook disabled to prevent duplicates. Use whatsapp-webhook instead.');
  
  return {
    success: false,
    response_type: 'text',
    message: "Service temporarily unavailable. Please try again."
  };
}

/**
 * Send WhatsApp response based on agent response type
 */
async function sendWhatsAppResponse(to: string, agentResponse: any): Promise<void> {
  try {
    switch (agentResponse.response_type) {
      case 'media':
        await sendWhatsAppMedia(to, agentResponse.message, agentResponse.media_url);
        break;
      case 'template':
        await sendWhatsAppMessage(to, agentResponse.message || 'Template response');
        break;
      case 'text':
      default:
        await sendWhatsAppMessage(to, agentResponse.message);
        break;
    }
  } catch (error) {
    console.error('❌ WhatsApp response error', error);
    await sendWhatsAppMessage(to, agentResponse.message || "Sorry, I encountered an error.");
  }
}

/**
 * Send WhatsApp text message
 */
async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }
    
    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: message }
    };
    
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }
    
    console.log('✅ WhatsApp message sent', { to, messageLength: message.length });
    
  } catch (error) {
    console.error('❌ WhatsApp send error', error);
    throw error;
  }
}

/**
 * Send WhatsApp media message
 */
async function sendWhatsAppMedia(to: string, caption: string, mediaUrl: string): Promise<void> {
  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "image",
      image: {
        link: mediaUrl,
        caption: caption
      }
    };
    
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }
    
    console.log('✅ WhatsApp media sent', { to, mediaUrl });
    
  } catch (error) {
    console.error('❌ WhatsApp media error', error);
    throw error;
  }
}