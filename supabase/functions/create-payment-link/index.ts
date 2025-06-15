
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { receiver, amount, sessionId } = await req.json()

    if (!receiver || !amount || !sessionId) {
      throw new Error('Missing required fields: receiver, amount, sessionId')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Set session context for RLS
    await supabaseClient.rpc('set_config', {
      setting_name: 'app.session_id',
      setting_value: sessionId,
      is_local: false
    })

    // Create shared link
    const { data: linkData, error: linkError } = await supabaseClient
      .from('shared_links')
      .insert({
        session_id: sessionId,
        phone_number: receiver,
        amount: parseInt(amount)
      })
      .select()

    if (linkError) throw linkError

    // Generate payment link URL
    const baseUrl = req.headers.get('origin') || 'https://your-app.com'
    const paymentLink = `${baseUrl}/pay/${linkData[0].link_token}`

    // Log analytics event
    await supabaseClient
      .from('events')
      .insert({
        session_id: sessionId,
        event_type: 'payment_link_created',
        event_data: {
          receiver,
          amount: parseInt(amount),
          link_token: linkData[0].link_token
        }
      })

    return new Response(
      JSON.stringify({
        paymentLink,
        linkToken: linkData[0].link_token,
        expiresAt: linkData[0].expires_at
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
