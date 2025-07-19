import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channel, recipient, message, message_type = "text", template_id, metadata, priority = "normal" } = await req.json();

    console.log(`Sending message via ${channel} to ${recipient}: ${message}`);

    if (channel === "whatsapp") {
      await sendWhatsAppMessage(recipient, message, message_type, template_id, metadata);
    } else {
      console.warn(`Unsupported channel: ${channel}`);
    }

    return new Response(
      JSON.stringify({ success: true, channel, recipient }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Channel gateway error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function sendWhatsAppMessage(
  to: string, 
  message: string, 
  messageType: string = "text",
  templateId?: string,
  metadata?: any
) {
  if (!WHATSAPP_PHONE_ID || !WHATSAPP_ACCESS_TOKEN) {
    throw new Error("WhatsApp credentials not configured");
  }

  // Clean phone number (remove any non-digits except +)
  const cleanPhone = to.replace(/[^\d+]/g, "");
  
  let body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
  };

  if (templateId) {
    // Template message
    body.type = "template";
    body.template = {
      name: templateId,
      language: { code: "en" },
      components: metadata?.components || []
    };
  } else {
    // Text message
    body.type = "text";
    body.text = { body: message };
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    console.error("WhatsApp API error:", errorData);
    throw new Error(`WhatsApp API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  console.log("WhatsApp message sent:", result);
  return result;
}