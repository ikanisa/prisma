import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QRPaymentRequest {
  amount: number
  currency?: string
  description?: string
  recipient_phone?: string
  user_phone: string
  transaction_type?: 'send' | 'request'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      amount, 
      currency = 'RWF', 
      description = 'Payment via easyMO',
      recipient_phone,
      user_phone,
      transaction_type = 'send'
    }: QRPaymentRequest = await req.json()

    // Validate inputs
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user_phone) {
      return new Response(
        JSON.stringify({ error: 'User phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate payment reference
    const payment_ref = `EMO${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        phone_number: user_phone,
        amount: amount,
        currency: currency,
        payment_method: 'momo_qr',
        status: 'pending',
        reference: payment_ref,
        description: description,
        recipient_phone: recipient_phone,
        metadata: {
          transaction_type,
          qr_generated: true,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment creation error:', paymentError)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate QR code data payload
    const qr_data = {
      payment_ref,
      amount,
      currency,
      description,
      recipient_phone: recipient_phone || 'easyMO',
      sender_phone: user_phone,
      type: transaction_type,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    }

    // Generate QR code SVG using the generate-qr-code-svg function
    const qrResponse = await supabase.functions.invoke('generate-qr-code-svg', {
      body: { 
        data: JSON.stringify(qr_data),
        size: 256,
        error_correction: 'M'
      }
    })

    if (qrResponse.error) {
      console.error('QR generation error:', qrResponse.error)
      return new Response(
        JSON.stringify({ error: 'Failed to generate QR code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = {
      payment_id: payment.id,
      payment_ref,
      qr_code_svg: qrResponse.data.svg,
      qr_data: qr_data,
      amount,
      currency,
      description,
      expires_at: qr_data.expires_at,
      status: 'pending',
      instructions: transaction_type === 'send' 
        ? `Scan this QR code with your mobile money app to send ${amount} ${currency}`
        : `Share this QR code to request ${amount} ${currency}`
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in qr-payment-generator:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})