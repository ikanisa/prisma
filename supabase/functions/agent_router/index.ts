// supabase/functions/agent_router/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { wa_message_id } = await req.json();

    if (!wa_message_id) {
      return new Response(JSON.stringify({ error: "Missing wa_message_id" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing message: ${wa_message_id}`);

    // 1) Load message & conversation
    const { data: msg, error: msgError } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("wa_message_id", wa_message_id)
      .single();

    if (msgError || !msg) {
      console.error("Message not found:", msgError);
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found message from ${msg.from_number}: ${msg.body}`);

    // 2) Build conversation history (last 20 messages)
    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("direction, body, created_at")
      .eq("from_number", msg.from_number)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = history?.map(h => ({
      role: h.direction === 'in' ? 'user' : 'assistant',
      content: h.body || ''
    })) ?? [];

    console.log(`Built conversation history with ${messages.length} messages`);

    // 3) Call OpenAI Chat Completions
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `You are the easyMO Payment Agent, a helpful assistant for mobile money payments and marketplace transactions in Rwanda. 
            
Key capabilities:
- Help users send/receive mobile money payments
- Generate USSD codes for MoMo transactions
- Assist with marketplace product listings and purchases
- Provide pricing information
- Handle customer support queries

Always respond in a friendly, helpful manner. Keep responses concise and actionable. If users mention payment amounts, help them generate the appropriate USSD codes.`
          },
          ...messages,
          { role: "user", content: msg.body }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const aiData = await openaiResponse.json();
    const answer = aiData.choices[0].message.content;

    console.log(`AI generated response: ${answer}`);

    // 4) Send reply via WhatsApp
    const sendResponse = await supabase.functions.invoke('send_whatsapp_message', {
      body: { 
        to: msg.from_number, 
        body: answer 
      }
    });

    if (sendResponse.error) {
      console.error("Failed to send WhatsApp message:", sendResponse.error);
      throw new Error("Failed to send WhatsApp message");
    }

    console.log("WhatsApp message sent successfully");

    // 5) Save outbound message to database
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        wa_message_id: `out_${Date.now()}_${Math.random()}`,
        from_number: msg.to_number,
        to_number: msg.from_number,
        direction: 'out',
        body: answer,
        msg_type: 'text',
        status: 'sent',
        raw_json: { ai_generated: true, original_message_id: wa_message_id }
      });

    if (insertError) {
      console.error("Failed to save outbound message:", insertError);
      // Don't fail the request, message was already sent
    }

    console.log("Agent routing completed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Message processed and reply sent" 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in agent_router:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});