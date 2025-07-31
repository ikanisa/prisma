import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { wa_id, message_text } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if message is an opt-out request
    const optOutPatterns = [
      /^(stop|unsubscribe|opt out)$/i,
      /^(para|arreter|stop)$/i, // French
      /^(guhagarika|kuyingire)$/i // Kinyarwanda
    ]

    const isOptOut = optOutPatterns.some(pattern => pattern.test(message_text.trim()))

    if (!isOptOut) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Not an opt-out request' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add to global opt-out registry
    const { error: optOutError } = await supabase
      .from('opt_outs')
      .upsert({
        wa_id,
        channel: 'whatsapp',
        reason: 'user_request'
      })

    if (optOutError) {
      console.warn('Failed to record opt-out:', optOutError.message)
    }

    // Update all campaign subscriptions
    const { error: updateError } = await supabase
      .from('campaign_subscribers')
      .update({ status: 'opted_out' })
      .eq('wa_id', wa_id)
      .eq('status', 'active')

    if (updateError) {
      console.warn('Failed to update campaign subscribers:', updateError.message)
    }

    // Send confirmation via channel-gateway
    const confirmationMessage = "✅ Opt-out confirmed. No more promos. Reply START to resubscribe anytime."
    
    const { error: channelError } = await supabase.functions.invoke('channel-gateway', {
      body: {
        to: wa_id,
        message: confirmationMessage,
        priority: 'system'
      }
    })

    if (channelError) {
      console.warn('Failed to send opt-out confirmation:', channelError.message)
    }

    console.log(`Processed opt-out for ${wa_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        wa_id,
        message: 'Opt-out processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in opt-out-webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})