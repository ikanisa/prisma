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
          // Skip status updates (delivery confirmations, read receipts)
          if (change.value?.statuses) {
            console.log('📨 Received status update, skipping processing');
            continue;
          }
          
          // Only process actual messages, not status updates
          if (change.field === 'messages' && change.value?.messages) {
            for (const message of change.value.messages) {
              const from = message.from;
              const messageText = message.text?.body;
              const messageType = message.type;
              const timestamp = new Date(parseInt(message.timestamp) * 1000);
              
              // Extract contact info from the payload
              const contactName = change.value?.contacts?.[0]?.profile?.name || 'Unknown';

              // Store/update contact information
              await supabase.from('wa_contacts').upsert({
                wa_id: from,
                profile_name: contactName,
                phone_number: from,
                last_seen: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'wa_id',
                ignoreDuplicates: false 
              });

              // Log the incoming message
              console.log(`Received ${messageType} message from ${from}: ${messageText || 'non-text'}`);

              // Check if we've already processed this exact message ID to prevent duplicates
              const { data: existingMessage } = await supabase
                .from('incoming_messages')
                .select('id')
                .eq('raw_payload->>id', message.id)
                .single();

              if (existingMessage) {
                console.log(`⚠️ Duplicate message ID detected, skipping: ${message.id}`);
                continue;
              }

              // Store in database
              await supabase.from('incoming_messages').insert({
                from_number: from,
                message_type: messageType,
                message_text: messageText,
                raw_payload: message,
                created_at: timestamp.toISOString()
              });

              // Process different message types
              if (messageType === 'text' && messageText) {
                await processTextMessage(supabase, from, messageText, message.id, contactName, timestamp);
              } else if (messageType === 'interactive') {
                await processInteractiveMessage(supabase, from, message.interactive, message.id, contactName, timestamp);
              } else if (messageType === 'button') {
                await processButtonMessage(supabase, from, message.button, message.id, contactName, timestamp);
              } else if (messageType === 'location') {
                await processLocationMessage(supabase, from, message.location, message.id, contactName, timestamp);
              } else if (messageType === 'image' || messageType === 'document') {
                await processMediaMessage(supabase, from, message, message.id, contactName, timestamp);
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

// Process text messages
async function processTextMessage(supabase: any, from: string, text: string, messageId: string, contactName: string, timestamp: Date) {
  console.log('📝 Processing text message:', text);
  
  // Route to Enhanced Omni Agent for intelligent processing
  try {
    const { data: result, error } = await supabase.functions.invoke('omni-agent-enhanced', {
      body: {
        message: text,
        phone: from,
        contact_name: contactName,
        message_id: messageId,
        timestamp: timestamp.toISOString()
      }
    });

    if (error) {
      console.error('❌ Omni agent error:', error);
    } else {
      console.log('✅ Text message processed:', result);
      
      // Send response back to user if agent provided one
      if (result?.response) {
        await sendWhatsAppMessage(from, result.response);
      }
    }
  } catch (error) {
    console.error('❌ Text processing error:', error);
    // Send fallback response
    await sendWhatsAppMessage(from, "🤖 I'm here to help! Send amount for payment QR (e.g., '5000') or 'menu' for options.");
  }
}

// Helper function to send WhatsApp messages
async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const phoneNumberId = Deno.env.get('PHONE_NUMBER_ID') || Deno.env.get('META_PHONE_NUMBER_ID') || '396791596844039';
    const accessToken = Deno.env.get('WHATSAPP_TOKEN') || Deno.env.get('META_WABA_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.error('❌ No WhatsApp access token found');
      return;
    }
    
    console.log(`📤 Sending message to ${to} via phone number ID: ${phoneNumberId}`);
    
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      })
    });

    const responseData = await response.text();
    
    if (!response.ok) {
      console.error('Failed to send WhatsApp message:', responseData);
    } else {
      console.log('✅ WhatsApp message sent successfully:', responseData);
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
  }
}

// Process interactive messages (lists, buttons)
async function processInteractiveMessage(supabase: any, from: string, interactive: any, messageId: string, contactName: string, timestamp: Date) {
  console.log('🎯 Processing interactive message:', interactive);
  
  let actionData = '';
  if (interactive.type === 'list_reply') {
    actionData = interactive.list_reply.id;
  } else if (interactive.type === 'button_reply') {
    actionData = interactive.button_reply.id;
  }

  // Route to WhatsApp Core Engine
  try {
    const { data: result, error } = await supabase.functions.invoke('whatsapp-core-engine', {
      body: {
        from,
        text: actionData,
        message_id: messageId,
        contact_name: contactName,
        timestamp: timestamp.toISOString(),
        message_type: 'interactive',
        interactive_data: interactive
      }
    });

    if (error) {
      console.error('❌ Interactive processing error:', error);
    } else {
      console.log('✅ Interactive message processed:', result);
    }
  } catch (error) {
    console.error('❌ Interactive processing error:', error);
  }
}

// Process button messages
async function processButtonMessage(supabase: any, from: string, button: any, messageId: string, contactName: string, timestamp: Date) {
  console.log('🔘 Processing button message:', button);
  
  // Route to WhatsApp Core Engine
  try {
    const { data: result, error } = await supabase.functions.invoke('whatsapp-core-engine', {
      body: {
        from,
        text: button.text || button.payload,
        message_id: messageId,
        contact_name: contactName,
        timestamp: timestamp.toISOString(),
        message_type: 'button',
        button_data: button
      }
    });

    if (error) {
      console.error('❌ Button processing error:', error);
    } else {
      console.log('✅ Button message processed:', result);
    }
  } catch (error) {
    console.error('❌ Button processing error:', error);
  }
}

// Process location messages
async function processLocationMessage(supabase: any, from: string, location: any, messageId: string, contactName: string, timestamp: Date) {
  console.log('📍 Processing location message:', location);
  
  // Store user location
  await supabase.from('user_locations').upsert({
    phone_number: from,
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address || null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'phone_number' });

  // Route to WhatsApp Core Engine
  try {
    const { data: result, error } = await supabase.functions.invoke('whatsapp-core-engine', {
      body: {
        from,
        text: `location_shared:${location.latitude},${location.longitude}`,
        message_id: messageId,
        contact_name: contactName,
        timestamp: timestamp.toISOString(),
        message_type: 'location',
        location_data: location
      }
    });

    if (error) {
      console.error('❌ Location processing error:', error);
    } else {
      console.log('✅ Location message processed:', result);
    }
  } catch (error) {
    console.error('❌ Location processing error:', error);
  }
}

// Process media messages (images, documents)
async function processMediaMessage(supabase: any, from: string, message: any, messageId: string, contactName: string, timestamp: Date) {
  console.log('📎 Processing media message:', message.type);
  
  // Route to WhatsApp Core Engine for media analysis
  try {
    const { data: result, error } = await supabase.functions.invoke('whatsapp-core-engine', {
      body: {
        from,
        text: `media_received:${message.type}`,
        message_id: messageId,
        contact_name: contactName,
        timestamp: timestamp.toISOString(),
        message_type: message.type,
        media_data: message[message.type]
      }
    });

    if (error) {
      console.error('❌ Media processing error:', error);
    } else {
      console.log('✅ Media message processed:', result);
    }
  } catch (error) {
    console.error('❌ Media processing error:', error);
  }
}