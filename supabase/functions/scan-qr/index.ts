
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
      throw new Error('Missing required fields: qrImage, sessionId')
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

    // Simple pattern matching for USSD codes in the image
    // In a real implementation, you'd use OCR or QR code decoding
    const ussdPattern = /\*182\*[18]\*1\*(\d+)\*(\d+)#/
    
    // For demo purposes, we'll simulate QR decoding
    // In production, you'd integrate with a proper QR/OCR service
    const simulatedUssdString = "*182*1*1*0788123456*1000#"
    const match = simulatedUssdString.match(ussdPattern)
    
    if (!match) {
      throw new Error('Could not decode USSD string from QR code')
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

    if (historyError) throw historyError

    // Log analytics event
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
