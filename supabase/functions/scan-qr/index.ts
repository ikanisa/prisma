
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
    const { qrImage, sessionId } = await req.json()

    if (!qrImage || !sessionId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: qrImage, sessionId',
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

    // Simple pattern matching for USSD codes in the image
    // In a real implementation, you'd use OCR or QR code decoding
    const ussdPattern = /\*182\*[18]\*1\*(\d+)\*(\d+)#/
    
    // For demo purposes, we'll simulate QR decoding
    // In production, you'd integrate with a proper QR/OCR service
    const simulatedUssdString = "*182*1*1*0788123456*1000#"
    const match = simulatedUssdString.match(ussdPattern)
    
    if (!match) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not decode USSD string from QR code',
          code: 'QR_DECODE_FAILED'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const [, receiver, amount] = match
    
    // Save scan to QR history
    const { error: historyError } = await supabaseClient
      .from('qr_history')
      .insert({
        session_id: sessionId,
        phone_number: receiver,
        amount: parseInt(amount),
        type: 'scan',
        ussd_string: simulatedUssdString
      })

    if (historyError) {
      console.error('History insert error:', historyError)
      // Continue anyway, as scan succeeded
    }

    // Log analytics event
    try {
      await supabaseClient
        .from('events')
        .insert({
          session_id: sessionId,
          event_type: 'qr_scanned',
          event_data: {
            receiver,
            amount: parseInt(amount)
          }
        })
    } catch (analyticsError) {
      console.warn('Analytics logging failed:', analyticsError)
    }

    return new Response(
      JSON.stringify({
        ussdString: simulatedUssdString,
        parsedReceiver: receiver,
        parsedAmount: parseInt(amount),
        result: 'success'
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
