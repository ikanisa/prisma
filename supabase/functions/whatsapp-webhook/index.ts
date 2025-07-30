import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// **FIX #6: ENVIRONMENT VARIABLES** - Support multiple env var formats
const verifyToken = Deno.env.get('META_WABA_VERIFY_TOKEN') || 
                   Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 
                   Deno.env.get('VERIFY_TOKEN') || 
                   'your_verify_token';

const accessToken = Deno.env.get('META_WABA_ACCESS_TOKEN') || 
                   Deno.env.get('WHATSAPP_TOKEN') || 
                   Deno.env.get('ACCESS_TOKEN');

const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID') || 
                     Deno.env.get('PHONE_NUMBER_ID');

// **FIX #8: CIRCULAR CALL PREVENTION** - Track processing to prevent loops
const processingMessages = new Set<string>();

serve(async (req) => {
  console.log('🚀 Consolidated WhatsApp Webhook starting...');
  
  // **FIX #3 & #4: IMMEDIATE RESPONSE** - Respond to Meta immediately to prevent retries
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('🔐 Webhook verification request:', { mode, token });

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully');
      return new Response(challenge, { headers: corsHeaders });
    } else {
      console.log('❌ Webhook verification failed');
      return new Response('Verification failed', { 
        status: 403,
        headers: corsHeaders 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('Incoming WhatsApp payload:', JSON.stringify(body, null, 2));

      // **FIX #3 & #4: IMMEDIATE RESPONSE** - Process async, respond immediately
      processWebhookAsync(body).catch(error => {
        console.error("❌ Async webhook processing error:", error);
      });

      // Return immediate response to prevent Meta retries
      return new Response("EVENT_RECEIVED", { 
        status: 200,
        headers: corsHeaders 
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("EVENT_RECEIVED", { 
        status: 200, // Always return 200 to prevent Meta retries
        headers: corsHeaders 
      });
    }
  }

  return new Response("Method not allowed", { 
    status: 405,
    headers: corsHeaders 
  });
});

// **FIX #1 & #5: ATOMIC DUPLICATE PREVENTION** - Async processing with proper duplicate handling
async function processWebhookAsync(body: any) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Handle different webhook events
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Skip status updates
        if (value.statuses) {
          console.log('📨 Received status update, skipping processing');
          continue;
        }

        // Process messages
        if (value.messages) {
          for (const message of value.messages) {
            const messageId = message.id;
            const from = message.from;
            const messageType = message.type;
            const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';

            // **FIX #8: CIRCULAR CALL PREVENTION** - Check if already processing
            if (processingMessages.has(messageId)) {
              console.log(`🔄 Message ${messageId} already being processed, skipping`);
              continue;
            }

            processingMessages.add(messageId);

            try {
              // **FIX #1: ATOMIC DUPLICATE PREVENTION** - Use upsert for safe insert
              const { data: upsertResult, error: upsertError } = await supabase
                .from('processed_inbound')
                .upsert({
                  msg_id: messageId,
                  wa_id: from,
                  processed_at: new Date().toISOString(),
                  metadata: { contact_name: contactName, message_type: messageType }
                }, {
                  onConflict: 'msg_id',
                  ignoreDuplicates: true
                })
                .select('msg_id');

              // If upsert returns no data, it means this was a duplicate
              if (!upsertResult || upsertResult.length === 0) {
                console.log(`⏭️ Duplicate message detected via upsert: ${messageId}`);
                continue;
              }

              if (upsertError) {
                console.error(`❌ Error upserting processed message: ${upsertError.message}`);
                continue;
              }

              console.log(`📨 Processing ${messageType} message from ${from}: ${message.text?.body || 'non-text'} [ID: ${messageId}]`);

              if (messageType === 'text') {
                console.log(`Received text message from ${from}: ${message.text.body}`);
                
                // **FIX #2: SINGLE AGENT CALL** - Process with single, controlled agent call
                await processMessageSafely(
                  supabase,
                  from,
                  message.text.body,
                  messageType,
                  messageId,
                  contactName,
                  new Date(parseInt(message.timestamp) * 1000),
                  message
                );
              }
            } finally {
              // Always remove from processing set
              processingMessages.delete(messageId);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Async webhook processing error:", error);
  }
}

// **FIX #2: CONTROLLED AGENT PROCESSING** - Single agent call with timeout and error handling
async function processMessageSafely(
  supabase: any,
  from: string,
  text: string,
  messageType: string,
  messageId: string,
  contactName: string,
  timestamp: Date,
  rawMessage: any
) {
  console.log(`🧠 Processing ${messageType} message from ${from}:`, text || 'non-text');
  
  try {
    // **FIX #2: SINGLE AGENT CALL** - Only call one agent with timeout
    const timeoutMs = 8000; // 8 seconds max
    const agentPromise = supabase.functions.invoke('omni-agent-enhanced', {
      body: { 
        message: text, 
        phone: from,
        userContext: {
          phone: from,
          name: contactName,
          preferredLanguage: 'rw',
          lastInteraction: timestamp.toISOString(),
          conversationCount: 1,
          userType: 'returning'
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Agent timeout')), timeoutMs)
    );

    console.log(`🤖 Calling omni-agent-enhanced for AI processing...`);
    const { data: response, error } = await Promise.race([agentPromise, timeoutPromise]) as any;

    if (error) {
      console.error(`❌ AI agent error:`, error);
      await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
      return;
    }

    if (response?.success && response?.response) {
      console.log(`✅ AI agent response received:`, JSON.stringify({
        success: response.success,
        response: response.response,
        confidence: response.confidence,
        intent: response.intent,
        toolsCalled: response.toolsCalled
      }));

      const truncatedResponse = response.response.length > 1000 
        ? response.response.substring(0, 1000) + '...' 
        : response.response;

      await sendWhatsAppMessage(from, truncatedResponse);
      console.log(`✅ Generated response for ${messageId}: ${truncatedResponse}`);
    } else {
      console.error(`❌ Invalid AI response:`, response);
      await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
    }

  } catch (error) {
    console.error(`❌ Error processing message:`, error);
    await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
  }
}

// **FIX #9: SINGLE CONSOLIDATED ENDPOINT** - Unified WhatsApp message sending
async function sendWhatsAppMessage(to: string, message: string) {
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Missing WhatsApp credentials');
    return;
  }

  try {
    console.log(`📤 Sending message to ${to} via phone number ID: ${phoneNumberId}`);
    
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ WhatsApp API error: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('✅ WhatsApp message sent successfully');
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
  }
}