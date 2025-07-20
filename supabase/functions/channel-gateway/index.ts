import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      channel = 'whatsapp', 
      recipient, 
      message, 
      message_type = 'text',
      template_id,
      priority = 5,
      send_immediately = false
    } = await req.json();

    if (!recipient || !message) {
      throw new Error('Recipient and message are required');
    }

    console.log(`Channel gateway: ${channel} message to ${recipient}`);

    // Prepare payload
    const payload = {
      message_text: message,
      message_type,
      template_id
    };

    if (send_immediately) {
      // Send directly without quality gate or queue
      const success = await sendDirect(channel, recipient, payload);
      
      return new Response(JSON.stringify({
        success,
        sent_immediately: true,
        recipient,
        channel
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // Route through quality gate
      await supabase.functions.invoke('response-quality-gate', {
        body: {
          message_text: message,
          phone_number: recipient,
          model_used: 'system'
        }
      });

      return new Response(JSON.stringify({
        success: true,
        queued: true,
        recipient,
        channel
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Channel gateway error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendDirect(channel: string, recipient: string, payload: any): Promise<boolean> {
  // Queue item for immediate processing
  const queueItem = {
    recipient,
    channel,
    payload,
    attempts: 0
  };

  // Invoke queue runner directly for immediate send
  const response = await supabase.functions.invoke('outbound-queue-runner', {
    body: { immediate_send: queueItem }
  });

  return response.data?.success || false;
}