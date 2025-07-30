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

// Process text messages with built-in intelligent routing
async function processTextMessage(supabase: any, from: string, text: string, messageId: string, contactName: string, timestamp: Date) {
  console.log('🧠 Processing text message:', text);
  
  try {
    // Route message based on intent
    const response = await routeMessage(text, from);
    
    console.log(`✅ Generated response: ${response}`);
    
    // Send response back to user
    await sendWhatsAppMessage(from, response);
    
  } catch (error) {
    console.error('❌ Text processing error:', error);
    // Send fallback response only on complete failure
    await sendWhatsAppMessage(from, "🤖 I'm here to help! Say 'pay', 'ride', 'shop', or 'help' for assistance.");
  }
}

// AI-powered message processing using omni-agent-enhanced
async function routeMessage(text: string, phone: string): Promise<string> {
  try {
    console.log('🤖 Calling omni-agent-enhanced for AI processing...');
    
    // Get Supabase URL for function calls
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Call the omni-agent-enhanced function
    const response = await fetch(`${supabaseUrl}/functions/v1/omni-agent-enhanced`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        phone: phone
      })
    });

    if (!response.ok) {
      console.error('❌ AI agent call failed:', response.status, await response.text());
      throw new Error(`AI agent call failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ AI agent response received:', data);
    
    // Return the AI-generated response
    return data.response || data.message || "🤖 I'm here to help! How can I assist you today?";
    
  } catch (error) {
    console.error('❌ Error calling AI agent:', error);
    
    // Fallback to welcome message if AI fails
    return "👋 **Welcome to easyMO!**\n\nYour all-in-one platform for:\n\n💰 **Payments** - Send/receive money\n🏍️ **Moto** - Book rides & transport\n🛒 **Shopping** - Bars, pharmacy, hardware\n🏠 **Property** - Houses & apartments\n\nWhat do you need help with today?";
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

  // Handle interactive responses directly
  try {
    const response = await routeMessage(actionData, from);
    await sendWhatsAppMessage(from, response);
    console.log('✅ Interactive message processed successfully');
  } catch (error) {
    console.error('❌ Interactive processing error:', error);
    await sendWhatsAppMessage(from, "🤖 I understand. How can I help you?");
  }
}

// Process button messages
async function processButtonMessage(supabase: any, from: string, button: any, messageId: string, contactName: string, timestamp: Date) {
  console.log('🔘 Processing button message:', button);
  
  // Handle button responses directly
  try {
    const buttonText = button.text || button.payload || 'help';
    const response = await routeMessage(buttonText, from);
    await sendWhatsAppMessage(from, response);
    console.log('✅ Button message processed successfully');
  } catch (error) {
    console.error('❌ Button processing error:', error);
    await sendWhatsAppMessage(from, "🤖 Thanks for clicking! How can I help you?");
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

  // Handle location sharing
  try {
    const response = "📍 **Location Received!**\n\nGreat! I've saved your location. Now I can:\n🏍️ Find nearby drivers for rides\n🛒 Show local businesses\n🏠 Search properties in your area\n\nWhat would you like to do?";
    await sendWhatsAppMessage(from, response);
    console.log('✅ Location message processed successfully');
  } catch (error) {
    console.error('❌ Location processing error:', error);
    await sendWhatsAppMessage(from, "📍 Thanks for sharing your location! How can I help you?");
  }
}

// Process media messages (images, documents)
async function processMediaMessage(supabase: any, from: string, message: any, messageId: string, contactName: string, timestamp: Date) {
  console.log('📎 Processing media message:', message.type);
  
  // Handle media messages directly
  try {
    let response = "📎 **Media Received!**\n\nThanks for sharing! ";
    
    if (message.type === 'image') {
      response += "I can see your image. How can I help you with this?";
    } else if (message.type === 'document') {
      response += "I received your document. What would you like me to do?";
    } else {
      response += "I received your file. How can I assist you?";
    }
    
    response += "\n\nSay 'help' to see all available services.";
    
    await sendWhatsAppMessage(from, response);
    console.log('✅ Media message processed successfully');
  } catch (error) {
    console.error('❌ Media processing error:', error);
    await sendWhatsAppMessage(from, "📎 Thanks for sharing! How can I help you?");
  }
}