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
    const { campaign_id } = await req.json()

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get campaign segments
    const { data: segments, error: segmentError } = await supabase
      .from('campaign_segments')
      .select('*')
      .eq('campaign_id', campaign_id)

    if (segmentError) {
      throw new Error(`Failed to get segments: ${segmentError.message}`)
    }

    let totalSubscribers = 0

    for (const segment of segments || []) {
      if (!segment.segment_sql) continue

      try {
        // Execute segment SQL to get contact list
        // For now, using a simple contacts query as example
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('phone_number, preferred_channel')
          .eq('conversion_status', 'prospect')
          .not('phone_number', 'in', `(SELECT wa_id FROM opt_outs)`)

        if (contactsError) {
          console.warn(`Segment ${segment.id} failed:`, contactsError.message)
          continue
        }

        // Upsert subscribers
        const subscribers = (contacts || []).map(contact => ({
          campaign_id,
          wa_id: contact.phone_number,
          lang: 'en',
          status: 'active'
        }))

        if (subscribers.length > 0) {
          const { error: upsertError } = await supabase
            .from('campaign_subscribers')
            .upsert(subscribers, { onConflict: 'campaign_id,wa_id' })

          if (upsertError) {
            console.warn(`Failed to upsert subscribers:`, upsertError.message)
          } else {
            totalSubscribers += subscribers.length
          }
        }

        // Update segment count
        await supabase
          .from('campaign_segments')
          .update({ 
            last_count: subscribers.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', segment.id)

      } catch (error) {
        console.error(`Error processing segment ${segment.id}:`, error)
      }
    }

    console.log(`Refreshed ${totalSubscribers} subscribers for campaign ${campaign_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        total_subscribers: totalSubscribers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in drip-segment-refresh:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})