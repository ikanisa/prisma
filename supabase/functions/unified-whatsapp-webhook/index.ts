import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// Environment variables with fallbacks
const VERIFY_TOKEN = Deno.env.get('META_WABA_VERIFY_TOKEN') || 
                    Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 
                    Deno.env.get('WA_VERIFY_TOKEN');

const WEBHOOK_SECRET = Deno.env.get('META_WABA_WEBHOOK_SECRET') || 
                      Deno.env.get('WHATSAPP_WEBHOOK_SECRET') || 
                      Deno.env.get('WHATSAPP_APP_SECRET');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

console.log('🚀 Unified WhatsApp Webhook starting...');
console.log('📋 VERIFY_TOKEN configured:', !!VERIFY_TOKEN);
console.log('📋 WEBHOOK_SECRET configured:', !!WEBHOOK_SECRET);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  try {
    // ✅ Step 1: WhatsApp Verification (GET request)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('🔐 Verification attempt:', { mode, token: !!token, challenge: !!challenge });

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verification successful');
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
      
      console.log('❌ Webhook verification failed');
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // ✅ Step 2: Handle incoming messages (POST request)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('📥 Webhook payload received:', JSON.stringify(body, null, 2));

      // Extract message data
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;
      const contacts = value?.contacts;

      if (!messages || messages.length === 0) {
        console.log('ℹ️ No messages in payload (status update or other webhook)');
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // Process each message
      for (const message of messages) {
        const fromPhone = message.from;
        const messageId = message.id;
        const messageType = message.type;
        const timestamp = new Date(parseInt(message.timestamp) * 1000);
        
        // Extract message content based on type
        let messageText = '';
        if (messageType === 'text') {
          messageText = message.text?.body || '';
        } else if (messageType === 'image') {
          messageText = message.image?.caption || '[Image]';
        } else {
          messageText = `[${messageType} message]`;
        }

        console.log('📱 Processing message:', {
          from: fromPhone,
          type: messageType,
          text: messageText.substring(0, 100)
        });

        // Get contact name if available
        const contact = contacts?.find((c: any) => c.wa_id === fromPhone);
        const contactName = contact?.profile?.name || 'Unknown';

        try {
          // ✅ Save to conversation_messages (main table for admin UI)
          const { data: conversationData, error: conversationError } = await supabase
            .from('conversation_messages')
            .insert({
              phone_number: fromPhone,
              sender: 'user',
              message_text: messageText,
              message_type: messageType,
              channel: 'whatsapp',
              metadata: {
                wa_message_id: messageId,
                contact_name: contactName,
                timestamp: timestamp.toISOString()
              },
              created_at: timestamp.toISOString()
            });

          if (conversationError) {
            console.error('❌ Failed to save to conversation_messages:', conversationError);
          } else {
            console.log('✅ Message saved to conversation_messages');
          }

          // ✅ Update/create contact
          const { error: contactError } = await supabase
            .from('contacts')
            .upsert({
              phone_number: fromPhone,
              name: contactName,
              last_interaction: timestamp.toISOString(),
              status: 'active',
              contact_type: 'user'
            }, { 
              onConflict: 'phone_number' 
            });

          if (contactError) {
            console.error('❌ Failed to update contact:', contactError);
          } else {
            console.log('✅ Contact updated');
          }

          // ✅ Log for debugging and monitoring
          const { error: logError } = await supabase
            .from('whatsapp_logs')
            .insert({
              message_id: messageId,
              phone_number: fromPhone,
              contact_name: contactName,
              message_type: messageType,
              message_content: messageText,
              timestamp: timestamp.toISOString(),
              received_at: new Date().toISOString(),
              processed: true,
              processed_at: new Date().toISOString()
            });

          if (logError) {
            console.error('❌ Failed to log message:', logError);
          }

          console.log('✅ Message processing completed for:', fromPhone);

        } catch (error) {
          console.error('❌ Error processing message:', error);
        }
      }

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
  }
});