import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, phone, description = 'easyMO Payment' } = await req.json();
    
    if (!amount || !phone) {
      throw new Error('Amount and phone number are required');
    }

    // Convert amount to number and validate it's positive
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    console.log(`💰 Generating USSD payment request for ${amount} RWF to ${phone}`);

    // Generate unique payment reference for tracking only (no API processing)
    const paymentRef = `EMO${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create USSD code for MTN Mobile Money Rwanda (P2P, no API)
    const ussdCode = `*182*1*1*${amount}*${phone}#`;
    const ussdLink = `tel:${encodeURIComponent(ussdCode)}`;

    // Insert payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        amount: paymentAmount,
        momo_code: phone,
        ussd_code: ussdCode,
        ussd_link: ussdLink,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Payment creation error:', error);
      throw new Error('Failed to create payment record');
    }

    console.log('✅ Payment created:', payment.id);

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      amount: amount,
      ussd_code: ussdCode,
      ussd_link: ussdLink,
      reference: paymentRef,
      instructions: `Dial ${ussdCode} to complete P2P mobile money payment (outside system)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Payment generation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});