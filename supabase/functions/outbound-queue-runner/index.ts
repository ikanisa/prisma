import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Queue runner processing batch...');

    // 1. Fetch pending messages (up to 100)
    const { data: pendingMessages, error } = await supabase
      .from('outbound_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      throw new Error(`Failed to fetch pending messages: ${error.message}`);
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: 'No pending messages'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${pendingMessages.length} pending messages`);

    let processed = 0;
    let failed = 0;

    // 2. Process each message
    for (const message of pendingMessages) {
      try {
        const success = await sendMessage(message);
        
        if (success) {
          // Mark as sent
          await supabase
            .from('outbound_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', message.id);
          
          processed++;
        } else {
          // Retry logic
          const nextAttempt = new Date();
          const backoffMinutes = Math.pow(2, message.attempts) * 5; // Exponential backoff
          nextAttempt.setMinutes(nextAttempt.getMinutes() + backoffMinutes);

          if (message.attempts >= 5) {
            // Give up after 5 attempts
            await supabase
              .from('outbound_queue')
              .update({
                status: 'failed',
                attempts: message.attempts + 1,
                error_message: 'Max retry attempts reached'
              })
              .eq('id', message.id);
          } else {
            // Schedule retry
            await supabase
              .from('outbound_queue')
              .update({
                attempts: message.attempts + 1,
                next_attempt_at: nextAttempt.toISOString(),
                error_message: 'Delivery failed, will retry'
              })
              .eq('id', message.id);
          }
          
          failed++;
        }

        // Rate limiting - small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        failed++;
        
        // Update with error
        await supabase
          .from('outbound_queue')
          .update({
            attempts: message.attempts + 1,
            error_message: error.message,
            next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min delay
          })
          .eq('id', message.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: pendingMessages.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Queue runner error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendMessage(queueItem: any): Promise<boolean> {
  const { recipient, channel, payload } = queueItem;

  switch (channel) {
    case 'whatsapp':
      return await sendWhatsAppMessage(recipient, payload);
    
    case 'sms':
      return await sendSMSMessage(recipient, payload);
    
    default:
      console.error(`Unsupported channel: ${channel}`);
      return false;
  }
}

async function sendWhatsAppMessage(recipient: string, payload: any): Promise<boolean> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error('WhatsApp credentials not configured');
    return false;
  }

  try {
    const { message_text, message_type = 'text', template_id } = payload;
    
    let messageBody;

    if (template_id) {
      // Template message
      messageBody = {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: template_id,
          language: { code: 'en' }
        }
      };
    } else {
      // Text message
      messageBody = {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: message_text }
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      }
    );

    if (response.ok) {
      console.log(`WhatsApp message sent to ${recipient}`);
      return true;
    } else {
      const errorData = await response.json();
      console.error('WhatsApp API error:', errorData);
      
      // Check for rate limiting
      if (response.status === 429) {
        console.log('Rate limited, will retry later');
      }
      
      return false;
    }

  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
}

async function sendSMSMessage(recipient: string, payload: any): Promise<boolean> {
  // SMS implementation would go here
  console.log(`SMS not implemented yet for ${recipient}`);
  return false;
}