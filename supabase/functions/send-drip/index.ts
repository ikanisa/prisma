import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subscriber_ids, campaign_id } = await req.json()

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get campaign template
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('template_text, max_sends')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found')
    }

    let successCount = 0

    for (const subscriberId of subscriber_ids) {
      try {
        // Get subscriber details
        const { data: subscriber, error: subError } = await supabase
          .from('campaign_subscribers')
          .select('wa_id, send_count, lang')
          .eq('id', subscriberId)
          .single()

        if (subError || !subscriber) {
          console.warn(`Subscriber ${subscriberId} not found`)
          continue
        }

        // Prepare message with basic variable substitution
        let message = campaign.template_text || "Hi! Check out our latest offers."
        message = message.replace(/{{first_name}}/g, 'there')

        // Send via channel-gateway (assuming it exists)
        const { error: channelError } = await supabase.functions.invoke('channel-gateway', {
          body: {
            to: subscriber.wa_id,
            message,
            priority: 'marketing'
          }
        })

        if (channelError) {
          console.warn(`Failed to send to ${subscriber.wa_id}:`, channelError.message)
          continue
        }

        // Update subscriber
        const newSendCount = subscriber.send_count + 1
        const updateData: any = {
          send_count: newSendCount,
          last_sent_at: new Date().toISOString()
        }

        if (newSendCount >= campaign.max_sends) {
          updateData.status = 'completed'
        }

        await supabase
          .from('campaign_subscribers')
          .update(updateData)
          .eq('id', subscriberId)

        // Log event
        await supabase
          .from('subscriber_events')
          .insert({
            subscriber_id: subscriberId,
            event: 'sent',
            meta: { campaign_id, message_length: message.length }
          })

        successCount++

      } catch (error) {
        console.error(`Error sending to subscriber ${subscriberId}:`, error)
      }
    }

    console.log(`Sent ${successCount}/${subscriber_ids.length} drip messages for campaign ${campaign_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        sent_count: successCount,
        total_requested: subscriber_ids.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-drip:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})