// Outbound Queue Runner - processes queued messages for reliable delivery
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting outbound queue processing...');

    // Get messages ready to send
    const { data: queuedMessages, error: fetchError } = await supabase
      .from('outbound_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('next_attempt_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching queue:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!queuedMessages || queuedMessages.length === 0) {
      console.log('📭 No messages to process');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📨 Processing ${queuedMessages.length} messages`);
    let processed = 0;
    let failed = 0;

    for (const message of queuedMessages) {
      try {
        // Check contact limits first
        const { data: limits } = await supabase
          .from('contact_limits')
          .select('*')
          .eq('phone_number', message.phone_number)
          .single();

        if (limits?.is_opted_out) {
          console.log(`⛔ Contact ${message.phone_number} is opted out, skipping`);
          await updateMessageStatus(message.id, 'cancelled', 'Contact opted out');
          continue;
        }

        if (limits && limits.daily_count >= 10) { // Daily limit
          console.log(`⚠️ Daily limit reached for ${message.phone_number}, rescheduling`);
          await rescheduleMessage(message.id);
          continue;
        }

        // Mark as processing
        await updateMessageStatus(message.id, 'processing');

        // Send via channel gateway
        const sendResult = await supabase.functions.invoke('channel-gateway', {
          body: {
            channel: message.channel,
            recipient: message.phone_number,
            message: message.message_text,
            template_id: message.template_id,
            metadata: message.metadata
          }
        });

        if (sendResult.error) {
          throw new Error(sendResult.error.message);
        }

        // Mark as sent
        await updateMessageStatus(message.id, 'sent', null, new Date().toISOString());
        processed++;

        console.log(`✅ Sent message to ${message.phone_number}`);

      } catch (error) {
        console.error(`❌ Failed to send message ${message.id}:`, error);
        
        if (message.retry_count < message.max_retries) {
          // Reschedule with exponential backoff
          const nextAttempt = new Date(Date.now() + Math.pow(2, message.retry_count) * 60000);
          await supabase
            .from('outbound_queue')
            .update({
              status: 'queued',
              retry_count: message.retry_count + 1,
              next_attempt_at: nextAttempt.toISOString(),
              failed_reason: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);
        } else {
          await updateMessageStatus(message.id, 'failed', error.message);
        }
        failed++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✨ Queue processing complete. Processed: ${processed}, Failed: ${failed}`);

    return new Response(JSON.stringify({
      processed,
      failed,
      total: queuedMessages.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Queue runner error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function updateMessageStatus(id: string, status: string, failedReason?: string, sentAt?: string) {
  const updates: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (failedReason) updates.failed_reason = failedReason;
  if (sentAt) updates.sent_at = sentAt;

  await supabase
    .from('outbound_queue')
    .update(updates)
    .eq('id', id);
}

async function rescheduleMessage(id: string) {
  const nextAttempt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour later
  await supabase
    .from('outbound_queue')
    .update({
      next_attempt_at: nextAttempt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
}