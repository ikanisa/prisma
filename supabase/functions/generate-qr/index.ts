
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Optimized QR code generation function
async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    // Use a faster QR code generation API with optimized parameters
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}&format=png&margin=1&color=1f2937&bgcolor=ffffff&ecc=M`);
    
    if (!response.ok) {
      throw new Error('QR code generation failed');
    }

    const qrImageBlob = await response.blob();
    const arrayBuffer = await qrImageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('QR generation error:', error);
    // Fallback: create a simple data URL with text
    const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <rect width="300" height="300" fill="white"/>
      <text x="150" y="150" text-anchor="middle" font-family="monospace" font-size="10" fill="black">${text}</text>
    </svg>`;
    const base64 = btoa(canvas);
    return `data:image/svg+xml;base64,${base64}`;
  }
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

    // Optimize: Generate USSD and method detection in parallel
    const [ussdData, methodData] = await Promise.all([
      supabaseClient.rpc('generate_ussd_string', { input_value: receiver, amount: parseInt(amount) }),
      supabaseClient.rpc('detect_payment_method', { input_value: receiver })
    ])

    if (ussdData.error) {
      console.error('USSD generation error:', ussdData.error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate USSD string',
          code: 'USSD_GENERATION_FAILED',
          details: ussdData.error.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (methodData.error) {
      console.error('Method detection error:', methodData.error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to detect payment method',
          code: 'METHOD_DETECTION_FAILED',
          details: methodData.error.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const ussdString = ussdData.data
    const telUri = `tel:${encodeURIComponent(ussdString)}`
    console.log('Generated tel URI:', telUri)

    // Generate QR code using tel: URI for better mobile compatibility
    const qrCodeDataURL = await generateQRCodeDataURL(telUri)

    // Optimize: Do database operations in background, return QR immediately
    let publicUrl = qrCodeDataURL
    let paymentId = null

    // Background operations - don't await these to speed up response
    Promise.all([
      // Upload to storage
      (async () => {
        try {
          const base64Data = qrCodeDataURL.split(',')[1]
          const qrCodeBlob = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
          const fileName = `${sessionId}/${Date.now()}.png`
          
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('qr-codes')
            .upload(fileName, qrCodeBlob, { contentType: 'image/png' })

          if (!uploadError) {
            const { data: { publicUrl: storageUrl } } = supabaseClient.storage
              .from('qr-codes')
              .getPublicUrl(fileName)
            publicUrl = storageUrl
          }
        } catch (error) {
          console.warn('Storage operation failed:', error)
        }
      })(),
      
      // Save to payments table
      (async () => {
        try {
          const { data: paymentData } = await supabaseClient
            .from('payments')
            .insert({
              session_id: sessionId,
              phone_number: receiver,
              momo_code: methodData.data === 'code' ? receiver : null,
              amount: parseInt(amount),
              method: methodData.data,
              ussd_string: ussdString,
              status: 'pending'
            })
            .select()
          paymentId = paymentData?.[0]?.id
        } catch (error) {
          console.warn('Payment insert failed:', error)
        }
      })(),
      
      // Save to QR history
      (async () => {
        try {
          await supabaseClient
            .from('qr_history')
            .insert({
              session_id: sessionId,
              phone_number: receiver,
              amount: parseInt(amount),
              type: 'generate',
              ussd_string: ussdString,
              qr_image_url: publicUrl
            })
        } catch (error) {
          console.warn('History insert failed:', error)
        }
      })(),
      
      // Log analytics
      (async () => {
        try {
          await supabaseClient
            .from('events')
            .insert({
              session_id: sessionId,
              event_type: 'qr_generated',
              event_data: {
                receiver,
                amount: parseInt(amount),
                method: methodData.data
              }
            })
        } catch (error) {
          console.warn('Analytics logging failed:', error)
        }
      })()
    ])

    // Return immediately with QR data
    return new Response(
      JSON.stringify({
        qrCodeImage: qrCodeDataURL,
        qrCodeUrl: publicUrl,
        ussdString,
        telUri,
        paymentId
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
