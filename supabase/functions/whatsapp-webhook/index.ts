import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CONSOLIDATED WHATSAPP WEBHOOK - THE ONLY ONE
console.log('🚀 Consolidated WhatsApp Webhook starting...');

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

    const verifyToken = Deno.env.get("META_WABA_VERIFY_TOKEN") || Deno.env.get("WHATSAPP_VERIFY_TOKEN") || 'easymo_verify';
    
    if (mode === "subscribe" && token === verifyToken) {
      console.log('✅ WhatsApp webhook verified successfully');
      return new Response(challenge ?? "", { status: 200 });
    }
    console.log('❌ WhatsApp webhook verification failed - invalid token');
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
              const messageId = message.id;
              
              // Extract contact info from the payload
              const contactName = change.value?.contacts?.[0]?.profile?.name || 'Unknown';
              
              console.log(`📨 Processing ${messageType} message from ${from}: ${messageText || 'non-text'} [ID: ${messageId}]`);

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

              // Enhanced duplicate detection with message processing tracking
              const { data: existingMessage } = await supabase
                .from('incoming_messages')
                .select('id')
                .eq('raw_payload->>id', messageId)
                .single();

              if (existingMessage) {
                console.log(`⚠️ Duplicate message ID detected, skipping: ${messageId}`);
                continue;
              }

              // Store processing attempt to prevent infinite loops
              await supabase.from('incoming_messages').insert({
                from_number: from,
                message_type: messageType,
                message_text: messageText,
                raw_payload: message,
                created_at: timestamp.toISOString()
              });

              // Update contact information
              await supabase.from('contacts').upsert({
                phone_number: from,
                name: contactName,
                last_interaction: timestamp.toISOString(),
                status: 'active'
              }, { 
                onConflict: 'phone_number',
                ignoreDuplicates: false 
              });

              // Process message with unified handler
              try {
                await processMessage(supabase, from, messageText, messageType, messageId, contactName, timestamp, message);
              } catch (error) {
                console.error(`❌ Error processing message ${messageId}:`, error);
                // Send fallback response
                await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
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

// Unified message processor - handles all message types
async function processMessage(supabase: any, from: string, text: string, messageType: string, messageId: string, contactName: string, timestamp: Date, rawMessage: any) {
  console.log(`🧠 Processing ${messageType} message from ${from}:`, text || 'non-text');
  
  try {
    let processedText = text;
    
    // Handle different message types
    if (messageType === 'interactive') {
      if (rawMessage.interactive?.type === 'list_reply') {
        processedText = rawMessage.interactive.list_reply.id;
      } else if (rawMessage.interactive?.type === 'button_reply') {
        processedText = rawMessage.interactive.button_reply.id;
      }
    } else if (messageType === 'button') {
      processedText = rawMessage.button?.text || rawMessage.button?.payload || 'button_pressed';
    } else if (messageType === 'location') {
      // Store location
      await supabase.from('user_locations').upsert({
        phone_number: from,
        latitude: rawMessage.location?.latitude,
        longitude: rawMessage.location?.longitude,
        address: rawMessage.location?.address || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });
      
      processedText = 'shared_location';
    } else if (messageType === 'image' || messageType === 'document') {
      processedText = `shared_${messageType}`;
    }

    // Route message to AI agent
    const response = await routeMessage(processedText || 'help', from);
    
    console.log(`✅ Generated response for ${messageId}: ${response.substring(0, 100)}...`);
    
    // Send response back to user
    await sendWhatsAppMessage(from, response);
    
  } catch (error) {
    console.error('❌ Message processing error:', error);
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

// Enhanced WhatsApp message sender with better error handling
async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_ID') || 
                         Deno.env.get('PHONE_NUMBER_ID') || 
                         Deno.env.get('META_PHONE_NUMBER_ID') || 
                         '396791596844039';
                         
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || 
                       Deno.env.get('WHATSAPP_TOKEN') || 
                       Deno.env.get('META_WABA_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.error('❌ No WhatsApp access token configured');
      return false;
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
      console.error(`❌ Failed to send WhatsApp message (${response.status}):`, responseData);
      return false;
    } else {
      console.log('✅ WhatsApp message sent successfully');
      return true;
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return false;
  }
}

// LEGACY FUNCTIONS - REMOVED FOR CONSOLIDATION
// All message types now handled by unified processMessage() function above