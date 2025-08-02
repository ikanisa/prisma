import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('🕐 Marketing scheduler running...');

    // Get scheduled marketing messages that are due
    const now = new Date().toISOString();
    const { data: scheduledMessages, error: queryError } = await supabase
      .from('marketing_send_log')
      .select(`
        *,
        marketing_campaigns (
          name,
          template_name,
          csat_threshold,
          status
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .limit(50); // Process in batches

    if (queryError) {
      console.error('Error querying scheduled messages:', queryError);
      throw queryError;
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      console.log('📭 No scheduled messages to process');
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: 'No messages due for sending'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📨 Processing ${scheduledMessages.length} scheduled messages`);

    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each scheduled message
    for (const message of scheduledMessages) {
      try {
        // Re-verify CSAT gating before sending
        const csatCheck = await recheckCSATGating(supabase, message.phone_number, message.marketing_campaigns?.csat_threshold);
        if (!csatCheck.passed) {
          await updateMessageStatus(supabase, message.id, 'failed', `CSAT recheck failed: ${csatCheck.reason}`);
          results.skipped++;
          continue;
        }

        // Re-verify frequency controls
        const frequencyCheck = await recheckFrequencyControls(supabase, message.phone_number, message.marketing_campaigns?.name);
        if (!frequencyCheck.canSend) {
          await updateMessageStatus(supabase, message.id, 'failed', `Frequency limit exceeded: ${frequencyCheck.reason}`);
          results.skipped++;
          continue;
        }

        // Check if campaign is still active
        if (message.marketing_campaigns?.status !== 'active') {
          await updateMessageStatus(supabase, message.id, 'failed', 'Campaign no longer active');
          results.skipped++;
          continue;
        }

        // Send the marketing message
        const sendResult = await sendMarketingMessage(supabase, message);
        
        if (sendResult.success) {
          await updateMessageStatus(supabase, message.id, 'sent', null, sendResult.messageId);
          results.sent++;
          console.log(`✅ Sent marketing message to ${message.phone_number}`);
        } else {
          await updateMessageStatus(supabase, message.id, 'failed', sendResult.error);
          results.failed++;
          results.errors.push(`${message.phone_number}: ${sendResult.error}`);
        }

      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        await updateMessageStatus(supabase, message.id, 'failed', error.message);
        results.failed++;
        results.errors.push(`${message.phone_number}: ${error.message}`);
      }
    }

    console.log(`📊 Marketing scheduler results: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      processed: scheduledMessages.length,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Marketing scheduler error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function recheckCSATGating(supabase: any, phone: string, threshold: number = 3.5): Promise<{
  passed: boolean;
  reason?: string;
}> {
  try {
    const { data: avgScore } = await supabase
      .rpc('get_user_avg_csat', { 
        user_phone: phone, 
        days_back: 30 
      });

    const score = avgScore || 3.0;

    if (score >= threshold) {
      return { passed: true };
    } else {
      return { 
        passed: false, 
        reason: `CSAT score ${score} below threshold ${threshold}` 
      };
    }
  } catch (error) {
    console.error('Error rechecking CSAT:', error);
    return { passed: true }; // Default to allow
  }
}

async function recheckFrequencyControls(supabase: any, phone: string, campaignType: string): Promise<{
  canSend: boolean;
  reason?: string;
}> {
  try {
    const { data: canSend } = await supabase
      .rpc('check_marketing_frequency', {
        user_phone: phone,
        campaign_type: campaignType
      });

    if (canSend) {
      return { canSend: true };
    } else {
      return {
        canSend: false,
        reason: 'Marketing frequency limits exceeded'
      };
    }
  } catch (error) {
    console.error('Error rechecking frequency:', error);
    return { canSend: true }; // Default to allow
  }
}

async function sendMarketingMessage(supabase: any, message: any): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Call the WhatsApp message sender
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        phone: message.phone_number,
        templateName: message.template_name,
        context: {
          type: 'marketing',
          campaignId: message.campaign_id,
          segmentId: message.segment_id,
          scheduledSend: true
        }
      }
    });

    if (sendError) {
      return { success: false, error: sendError.message };
    }

    if (sendResult?.success) {
      return { 
        success: true, 
        messageId: sendResult.messageId 
      };
    } else {
      return { 
        success: false, 
        error: sendResult?.error || 'Unknown send error' 
      };
    }

  } catch (error) {
    console.error('Error sending marketing message:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

async function updateMessageStatus(
  supabase: any, 
  messageId: string, 
  status: string, 
  errorDetails?: string | null,
  sentMessageId?: string
) {
  try {
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
      if (sentMessageId) {
        updateData.metadata = { 
          sentMessageId: sentMessageId,
          sentAt: new Date().toISOString()
        };
      }
    }

    if (errorDetails) {
      updateData.error_details = errorDetails;
    }

    const { error } = await supabase
      .from('marketing_send_log')
      .update(updateData)
      .eq('id', messageId);

    if (error) {
      console.error('Error updating message status:', error);
    }
  } catch (error) {
    console.error('Error in updateMessageStatus:', error);
  }
}