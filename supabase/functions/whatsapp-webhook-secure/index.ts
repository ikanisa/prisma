import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Verify webhook token
const VERIFY_TOKEN = Deno.env.get('META_WABA_VERIFY_TOKEN');
const ACCESS_TOKEN = Deno.env.get('META_WABA_TOKEN');
const PHONE_NUMBER_ID = Deno.env.get('META_WABA_PHONE_ID');

// Generate SHA256 hash for idempotency
function generateTxHash(msgId: string, toolName: string, args: any): string {
  const hashString = msgId + toolName + JSON.stringify(args);
  return createHash("sha256").update(hashString).toString();
}

// Send WhatsApp message with idempotency
async function sendOnce(txHash: string, waId: string, payload: any) {
  console.log(`🔄 Checking if message already sent: ${txHash}`);
  
  const { data: existing } = await supabase
    .from('outgoing_log')
    .select('tx_hash')
    .eq('tx_hash', txHash)
    .single();

  if (existing) {
    console.log(`✅ Message already sent, skipping: ${txHash}`);
    return;
  }

  console.log(`📤 Sending new message: ${txHash}`);
  
  // Send to WhatsApp API
  const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ WhatsApp API error:`, errorText);
    throw new Error(`WhatsApp API error: ${response.status} ${errorText}`);
  }

  // Log successful send
  await supabase.from('outgoing_log').insert({
    tx_hash: txHash,
    wa_id: waId,
    payload: payload,
    delivery_status: 'sent'
  });

  console.log(`✅ Message sent and logged: ${txHash}`);
}

// Check if banner should be sent (throttle to once per hour)
async function shouldSendBanner(waId: string): Promise<boolean> {
  const { data: contact } = await supabase
    .from('contacts')
    .select('last_banner_ts')
    .eq('phone_number', waId)
    .single();

  if (!contact?.last_banner_ts) {
    return true;
  }

  const lastBanner = new Date(contact.last_banner_ts);
  const now = new Date();
  const hoursSinceLastBanner = (now.getTime() - lastBanner.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastBanner >= 1;
}

// Update banner timestamp
async function updateBannerTimestamp(waId: string) {
  await supabase
    .from('contacts')
    .update({ last_banner_ts: new Date().toISOString() })
    .eq('phone_number', waId);
}

// Process incoming WhatsApp message with GPT
async function processWithGPT(body: any) {
  const msgId = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;
  const waId = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id;
  const messageText = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;

  if (!msgId || !waId) {
    console.log('❌ Missing required message data');
    return;
  }

  console.log(`🎯 Processing message: ${msgId} from ${waId}`);

  // Store message in unified_messages table
  await supabase.from('unified_messages').insert({
    id: msgId,
    conversation_id: `whatsapp_${waId}`,
    sender_phone: waId,
    content: messageText || 'No text content',
    message_type: 'text',
    platform: 'whatsapp',
    metadata: {
      wa_message_id: msgId,
      timestamp: body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.timestamp
    }
  });

  // Check if should send Quick Services banner
  const shouldSendQuickServices = await shouldSendBanner(waId);
  
  if (shouldSendQuickServices) {
    const bannerTxHash = generateTxHash(msgId, 'quick_services_banner', { waId });
    
    const quickServicesPayload = {
      messaging_product: "whatsapp",
      to: waId,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: "🚀 Quick Services"
        },
        body: {
          text: "Choose from our available services:"
        },
        footer: {
          text: "Select to get started"
        },
        action: {
          button: "View Services",
          sections: [
            {
              title: "💰 Financial Services",
              rows: [
                {
                  id: "generate_qr",
                  title: "💳 Generate QR Payment",
                  description: "Create QR code for receiving money"
                },
                {
                  id: "check_balance",
                  title: "💰 Check Balance",
                  description: "View your account balance"
                }
              ]
            },
            {
              title: "🚗 Transportation",
              rows: [
                {
                  id: "book_ride",
                  title: "🚖 Book Ride",
                  description: "Request a ride to your destination"
                },
                {
                  id: "driver_status",
                  title: "🚙 Driver Status",
                  description: "Check driver availability"
                }
              ]
            },
            {
              title: "🛒 Marketplace",
              rows: [
                {
                  id: "browse_products",
                  title: "🛍️ Browse Products",
                  description: "View available products"
                },
                {
                  id: "my_orders",
                  title: "📦 My Orders",
                  description: "Check your order status"
                }
              ]
            }
          ]
        }
      }
    };

    await sendOnce(bannerTxHash, waId, quickServicesPayload);
    await updateBannerTimestamp(waId);
  }

  // Process with Template-Driven Agent (prioritizes templates, quick actions, and services)
  try {
    const { error: templateAgentError } = await supabase.functions.invoke('template-driven-agent', {
      body: {
        phone_number: waId,
        message: messageText || 'hello',
        message_id: msgId,
        platform: 'whatsapp'
      }
    });

    if (templateAgentError) {
      console.warn('⚠️ Template agent failed, falling back to Omni agent:', templateAgentError);
      
      // Fallback to Omni Agent
      const { error: omniAgentError } = await supabase.functions.invoke('omni-agent-enhanced', {
        body: {
          phone_number: waId,
          message: messageText || 'hello',
          message_id: msgId,
          platform: 'whatsapp'
        }
      });

      if (omniAgentError) {
        console.warn('⚠️ Both agents failed, sending fallback message:', omniAgentError);
        
        // Send fallback message
        const fallbackTxHash = generateTxHash(msgId, 'fallback_message', { waId });
        const fallbackPayload = {
          messaging_product: "whatsapp",
          to: waId,
          type: "text",
          text: {
            body: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."
          }
        };
        
        await sendOnce(fallbackTxHash, waId, fallbackPayload);
      }
    }
  } catch (error) {
    console.error('❌ Failed to invoke template-driven agent:', error);
  }
}

serve(withErrorHandling(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Webhook verification (GET)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
          console.log('✅ Webhook verified successfully');
          return new Response(challenge, { status: 200 });
        } else {
          console.log('❌ Webhook verification failed');
          return new Response('Forbidden', { status: 403 });
        }
      }

      return new Response('Bad request', { status: 400 });
    }

    // Message processing (POST)
    if (req.method === 'POST') {
      const body = await req.json();
      
      const msgId = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;
      const waId = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id;

      if (!msgId || !waId) {
        console.log('❌ No valid message data found');
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      console.log(`📥 Received message: ${msgId} from ${waId}`);

      // 🔒 IDEMPOTENCY CHECK: Prevent duplicate processing
      const { data: existing } = await supabase
        .from('processed_inbound')
        .select('msg_id')
        .eq('msg_id', msgId)
        .single();

      if (existing) {
        console.log(`✅ Message already processed: ${msgId}`);
        return new Response('duplicate', { status: 200, headers: corsHeaders });
      }

      // Mark as processed
      await supabase.from('processed_inbound').insert({
        msg_id: msgId,
        wa_id: waId,
        metadata: {
          timestamp: new Date().toISOString(),
          webhook_body: body
        }
      });

      // Process the message
      await processWithGPT(body);

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('❌ Webhook request failed:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});