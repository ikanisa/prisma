import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QRRequest {
  action: 'generate' | 'scan';
  amount?: number;
  phone?: string;
  type?: 'receive' | 'send';
  user_id?: string;
  qr_data?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, amount, phone, type, user_id, qr_data }: QRRequest = await req.json();

    if (action === 'generate') {
      return await generateQRCode(supabase, amount!, phone!, type!, user_id!);
    } else if (action === 'scan') {
      return await processScannedQR(supabase, qr_data!, user_id!);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('QR Payment Generator error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateQRCode(supabase: any, amount: number, phone: string, type: string, userId: string) {
  try {
    // Generate payment reference
    const reference = `EMO${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: amount,
        currency: 'RWF',
        momo_code: phone,
        ussd_code: '', // Will be updated after generation
        ref: reference,
        purpose: type || 'payment'
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Payment creation failed: ${paymentError.message}`);
    }

    // Generate QR code content
    const qrContent = {
      type: 'easymo_payment',
      reference: reference,
      amount: amount,
      currency: 'RWF',
      phone: phone,
      action: type
    };

    // Call QR generation service
    const qrResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/qr-render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        text: JSON.stringify(qrContent),
        id: reference,
        agent: 'payment',
        entity: 'qr_code'
      })
    });

    if (!qrResponse.ok) {
      throw new Error('QR code generation failed');
    }

    const qrData = await qrResponse.json();

    // Generate USSD code based on phone type
    let ussdCode;
    if (phone.startsWith('078') || phone.startsWith('079')) {
      // MTN MoMo number format
      ussdCode = `*182*1*1*${phone}*${amount}#`;
    } else {
      // MoMo code format
      ussdCode = `*182*8*1*${phone}*${amount}#`;
    }
    
    // Generate payment link
    const paymentLink = `https://pay.easymo.rw/qr/${reference}`;

    // Update payment with QR data
    await supabase
      .from('payments')
      .update({
        qr_code_url: qrData.url,
        ussd_code: ussdCode,
        ussd_link: paymentLink
      })
      .eq('id', payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        reference: reference,
        qr_url: qrData.url,
        ussd_code: ussdCode,
        payment_link: paymentLink,
        amount: amount,
        currency: 'RWF',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('QR generation error:', error);
    return new Response(
      JSON.stringify({ error: 'QR generation failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

async function processScannedQR(supabase: any, qrData: string, userId: string) {
  try {
    let parsedData;
    
    // Try to parse QR data
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      // If not JSON, treat as plain text (could be USSD, link, etc.)
      return handleNonJSONQR(qrData);
    }

    // Handle easyMO payment QR
    if (parsedData.type === 'easymo_payment') {
      // Look up the payment
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('ref', parsedData.reference)
        .single();

      if (error || !payment) {
        return new Response(
          JSON.stringify({ error: 'Payment not found or expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      if (payment.paid_at) {
        return new Response(
          JSON.stringify({ 
            error: 'Payment already processed',
            paid_at: payment.paid_at 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Payment found: ${payment.amount} RWF to ${parsedData.phone}`,
          payment: {
            reference: parsedData.reference,
            amount: payment.amount,
            currency: payment.currency,
            recipient: parsedData.phone,
            action: parsedData.action
          },
          next_step: 'confirm_payment'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle other QR types
    return new Response(
      JSON.stringify({ 
        error: 'Unsupported QR code type',
        type: parsedData.type || 'unknown'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('QR scan processing error:', error);
    return new Response(
      JSON.stringify({ error: 'QR scan processing failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

function handleNonJSONQR(qrData: string) {
  // Handle USSD codes
  if (qrData.match(/^\*\d+\*.*#$/)) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'USSD code detected',
        ussd_code: qrData,
        instruction: `Dial ${qrData} on your phone to complete the payment`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Handle URLs
  if (qrData.startsWith('http')) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment link detected',
        payment_url: qrData,
        instruction: 'Open this link to complete the payment'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Unknown format
  return new Response(
    JSON.stringify({
      error: 'Unknown QR code format',
      data: qrData.substring(0, 100) // Limit for security
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
  );
}