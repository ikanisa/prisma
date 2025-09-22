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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find campaigns that need to send
    const { data: campaigns, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('status', 'running')
      .lt('start_at', new Date().toISOString())

    if (campaignError) {
      throw new Error(`Failed to get campaigns: ${campaignError.message}`)
    }

    let totalSent = 0

    for (const campaign of campaigns || []) {
      // Get subscribers ready to receive next message
      const cutoffTime = new Date(Date.now() - (campaign.interval_min * 60 * 1000)).toISOString()
      
      const { data: subscribers, error: subscriberError } = await supabase
        .from('campaign_subscribers')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('status', 'active')
        .lt('send_count', campaign.max_sends)
        .or(`last_sent_at.is.null,last_sent_at.lt.${cutoffTime}`)
        .limit(500) // Batch size

      if (subscriberError) {
        console.warn(`Failed to get subscribers for campaign ${campaign.id}:`, subscriberError.message)
        continue
      }

      if (subscribers && subscribers.length > 0) {
        // Invoke send-drip function
        const { error: sendError } = await supabase.functions.invoke('send-drip', {
          body: {
            subscriber_ids: subscribers.map(s => s.id),
            campaign_id: campaign.id
          }
        })

        if (sendError) {
          console.warn(`Failed to send drip for campaign ${campaign.id}:`, sendError.message)
        } else {
          totalSent += subscribers.length
        }
      }

      // Check if campaign is complete
      const { data: activeSubscribers } = await supabase
        .from('campaign_subscribers')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('status', 'active')
        .lt('send_count', campaign.max_sends)

      if (!activeSubscribers || activeSubscribers.length === 0) {
        await supabase
          .from('marketing_campaigns')
          .update({ status: 'completed' })
          .eq('id', campaign.id)
        
        console.log(`Campaign ${campaign.id} completed`)
      }
    }

    console.log(`Drip scheduler processed ${campaigns?.length || 0} campaigns, sent ${totalSent} messages`)

    return new Response(
      JSON.stringify({
        success: true,
        campaigns_processed: campaigns?.length || 0,
        messages_sent: totalSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in drip-scheduler:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})