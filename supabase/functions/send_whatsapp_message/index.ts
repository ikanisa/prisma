// supabase/functions/send_whatsapp_message/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TOKEN = Deno.env.get("META_WABA_TOKEN")!;
const PHONE_ID = Deno.env.get("META_WABA_PHONE_ID")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const { to, body } = await req.json();

    if (!to || !body) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'body' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body }
    };

    console.log(`Sending WhatsApp message to ${to}: ${body}`);

    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("WhatsApp API error:", data);
      return new Response(JSON.stringify({ error: "Failed to send message", details: data }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("Message sent successfully:", data);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});