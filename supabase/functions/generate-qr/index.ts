
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import QRCode from "https://esm.sh/qrcode@1.5.3"

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

    // Generate USSD string using database function
    const { data: ussdData, error: ussdError } = await supabaseClient
      .rpc('generate_ussd_string', { input_value: receiver, amount: parseInt(amount) })

    if (ussdError) {
      console.error('USSD generation error:', ussdError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate USSD string',
          code: 'USSD_GENERATION_FAILED',
          details: ussdError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const ussdString = ussdData

    // Detect payment method
    const { data: methodData, error: methodError } = await supabaseClient
      .rpc('detect_payment_method', { input_value: receiver })

    if (methodError) {
      console.error('Method detection error:', methodError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to detect payment method',
          code: 'METHOD_DETECTION_FAILED',
          details: methodError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(ussdString, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })

    // Convert data URL to blob for storage
    const base64Data = qrCodeDataURL.split(',')[1]
    const qrCodeBlob = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Upload to Supabase Storage
    const fileName = `${sessionId}/${Date.now()}.png`
    let publicUrl = qrCodeDataURL // Fallback to data URL

    try {
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('qr-codes')
        .upload(fileName, qrCodeBlob, {
          contentType: 'image/png'
        })

      if (!uploadError) {
        const { data: { publicUrl: storageUrl } } = supabaseClient.storage
          .from('qr-codes')
          .getPublicUrl(fileName)
        publicUrl = storageUrl
      } else {
        console.warn('Storage upload failed, using data URL:', uploadError)
      }
    } catch (storageError) {
      console.warn('Storage operation failed:', storageError)
    }

    // Save to payments table
    const { data: paymentData, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        session_id: sessionId,
        phone_number: receiver,
        momo_code: methodData === 'code' ? receiver : null,
        amount: parseInt(amount),
        method: methodData,
        ussd_string: ussdString,
        status: 'pending'
      })
      .select()

    if (paymentError) {
      console.error('Payment insert error:', paymentError)
      // Continue anyway, as QR generation succeeded
    }

    // Save to QR history
    const { error: historyError } = await supabaseClient
      .from('qr_history')
      .insert({
        session_id: sessionId,
        phone_number: receiver,
        amount: parseInt(amount),
        type: 'generate',
        ussd_string: ussdString,
        qr_image_url: publicUrl
      })

    if (historyError) {
      console.error('History insert error:', historyError)
      // Continue anyway, as QR generation succeeded
    }

    // Log analytics event
    try {
      await supabaseClient
        .from('events')
        .insert({
          session_id: sessionId,
          event_type: 'qr_generated',
          event_data: {
            receiver,
            amount: parseInt(amount),
            method: methodData
          }
        })
    } catch (analyticsError) {
      console.warn('Analytics logging failed:', analyticsError)
    }

    return new Response(
      JSON.stringify({
        qrCodeImage: qrCodeDataURL,
        qrCodeUrl: publicUrl,
        ussdString,
        paymentId: paymentData?.[0]?.id
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
