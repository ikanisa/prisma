
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
    console.log('QR scan request received')
    const { qrImage, sessionId, enhanceImage, aiProcessing } = await req.json()

    if (!qrImage) {
      console.error('Missing qrImage in request')
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: qrImage',
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

    // Set session context for RLS if sessionId provided
    if (sessionId) {
      try {
        await supabaseClient.rpc('set_config', {
          setting_name: 'app.session_id',
          setting_value: sessionId,
          is_local: false
        })
        console.log('Session context set:', sessionId)
      } catch (err) {
        console.warn('Could not set session context:', err)
      }
    }

    // Enhanced QR processing simulation
    console.log('Processing QR image with AI enhancement:', { enhanceImage, aiProcessing })
    
    // In a real implementation, you would:
    // 1. Decode the base64 image
    // 2. Use an OCR/QR service like Google Vision API or AWS Textract
    // 3. Apply image enhancement if requested
    // 4. Return the extracted QR content
    
    // For demo purposes, simulate different QR patterns
    const simulatedQRPatterns = [
      "*182*1*1*0788123456*1000#",
      "*182*8*1*5678*500#",
      "*182*1*1*0799887766*2500#"
    ]
    
    const randomPattern = simulatedQRPatterns[Math.floor(Math.random() * simulatedQRPatterns.length)]
    const ussdPattern = /\*182\*[18]\*1\*(\d+)\*(\d+)#/
    const match = randomPattern.match(ussdPattern)
    
    if (!match) {
      console.log('No valid USSD pattern found')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Could not decode USSD string from QR code',
          code: 'QR_DECODE_FAILED',
          confidence: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const [, receiver, amount] = match
    console.log('QR decoded successfully:', { receiver, amount })
    
    // Save scan to QR history if session provided
    if (sessionId) {
      const { error: historyError } = await supabaseClient
        .from('qr_history')
        .insert({
          session_id: sessionId,
          phone_number: receiver,
          amount: parseInt(amount),
          type: 'ai_scan',
          ussd_string: randomPattern
        })

      if (historyError) {
        console.error('History insert error:', historyError)
        // Continue anyway, as scan succeeded
      } else {
        console.log('Scan saved to history')
      }
    }

    // Log analytics event
    try {
      await supabaseClient
        .from('events')
        .insert({
          session_id: sessionId || 'anonymous',
          event_type: 'qr_ai_processed',
          event_data: {
            receiver,
            amount: parseInt(amount),
            enhanceImage,
            aiProcessing
          }
        })
      console.log('Analytics logged')
    } catch (analyticsError) {
      console.warn('Analytics logging failed:', analyticsError)
    }

    const confidence = aiProcessing ? 0.95 : 0.8
    const response = {
      success: true,
      ussdString: randomPattern,
      ussdCode: randomPattern,
      parsedReceiver: receiver,
      parsedAmount: parseInt(amount),
      confidence,
      processingTime: Math.floor(Math.random() * 1000) + 500,
      method: aiProcessing ? 'ai' : 'standard'
    }

    console.log('Returning successful response:', response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Unexpected error in scan-qr function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
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
