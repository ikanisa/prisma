
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
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: receiver, amount, sessionId',
          code: 'MISSING_FIELDS'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Set session context for RLS
    try {
      await supabaseClient.rpc('set_config', {
        setting_name: 'app.session_id',
        setting_value: sessionId,
        is_local: false
      })
    } catch (err) {
      console.warn('Could not set session context:', err)
    }

    // Create shared link
    const { data: linkData, error: linkError } = await supabaseClient
      .from('shared_links')
      .insert({
        session_id: sessionId,
        phone_number: receiver,
        amount: parseInt(amount)
      })
      .select()

    if (linkError) {
      console.error('Link creation error:', linkError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment link',
          code: 'LINK_CREATION_FAILED',
          details: linkError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Generate payment link URL
    const baseUrl = req.headers.get('origin') || req.headers.get('referer') || 'https://your-app.com'
    const cleanBaseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    const paymentLink = `${cleanBaseUrl}/shared/${linkData[0].link_token}`

    // Log analytics event
    try {
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
    } catch (analyticsError) {
      console.warn('Analytics logging failed:', analyticsError)
    }

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
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
