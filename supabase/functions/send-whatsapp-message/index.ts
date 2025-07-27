import { serve } from "https://deno.land/std@0.182.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { to_number, message_text } = await req.json();
    
    // Enhanced input validation
    if (!to_number || !message_text) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing to_number or message_text' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate to_number format (basic phone number validation)
    if (typeof to_number !== 'string' || !/^\+?[1-9]\d{1,14}$/.test(to_number.replace(/\s/g, ''))) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid phone number format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate message_text
    if (typeof message_text !== 'string') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Message text must be a string' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Limit message length to 2000 characters
    if (message_text.length > 2000) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Message exceeds 2000 character limit' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use META_WABA_* names to align with your WhatsApp Business API configuration.
    // If these variables are missing, the call will fail.
    const phoneNumberId =
      Deno.env.get("META_WABA_PHONE_ID") ??
      Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const apiToken =
      Deno.env.get("META_WABA_TOKEN") ??
      Deno.env.get("WHATSAPP_API_TOKEN");

    if (!phoneNumberId || !apiToken) {
      console.error("⚠️ Missing WhatsApp API credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Missing WhatsApp API credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log('📤 Sending WhatsApp message to:', to_number)

    const payload = {
      messaging_product: "whatsapp",
      to: to_number,
      type: "text",
      text: { body: message_text },
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("❗ Failed to send WhatsApp message", data);
      return new Response(
        JSON.stringify({ success: false, error: data }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log('✅ WhatsApp message sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("❗ Error processing send-whatsapp-message", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});