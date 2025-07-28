import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === Deno.env.get("META_WABA_VERIFY_TOKEN")) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Incoming WhatsApp payload:", JSON.stringify(body, null, 2));

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Process incoming messages
      if (body.entry && body.entry[0]?.changes) {
        for (const change of body.entry[0].changes) {
          if (change.field === 'messages' && change.value?.messages) {
            for (const message of change.value.messages) {
              const from = message.from;
              const messageText = message.text?.body;
              const messageType = message.type;
              const timestamp = new Date(parseInt(message.timestamp) * 1000);

              // Log the incoming message
              console.log(`Received ${messageType} message from ${from}: ${messageText}`);

              // Store in database
              await supabase.from('incoming_messages').insert({
                from_number: from,
                message_type: messageType,
                message_text: messageText,
                raw_payload: message,
                created_at: timestamp.toISOString()
              });

              // Process text messages with AI
              if (messageType === 'text' && messageText) {
                try {
                  // Call the AI processor
                  console.log('Calling process-incoming-messages function...');
                  const { data: response, error } = await supabase.functions.invoke('process-incoming-messages', {
                    body: {
                      from: from,
                      message: messageText,
                      timestamp: timestamp.toISOString()
                    }
                  });
                  console.log('AI processor response:', { response, error });

                  if (error) {
                    console.error('Error calling process-incoming-messages:', error);
                  } else {
                    console.log('Message processed successfully:', response);
                  }
                } catch (error) {
                  console.error('Error processing message:', error);
                }
              }
            }
          }
        }
      }

      return new Response("EVENT_RECEIVED", { 
        status: 200,
        headers: corsHeaders 
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Error processing webhook", { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }

  return new Response("Method not allowed", { 
    status: 405,
    headers: corsHeaders 
  });
});
