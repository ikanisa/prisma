
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { amount, phone, trip_id, booking_id, description = 'easyMO Ride Payment' } = await req.json();
    
    if (!amount || !phone) {
      throw new Error('Amount and phone number are required');
    }

    if (amount < 100 || amount > 100000) {
      throw new Error('Amount must be between 100 and 100,000 RWF');
    }

    console.log(`💰 Processing payment: ${amount} RWF from ${phone}`);

    // Generate unique payment reference
    const paymentRef = `EMO${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create USSD code for MTN Mobile Money Rwanda
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const ussdCode = `*182*1*1*${amount}*${cleanPhone}#`;
    const ussdLink = `tel:${encodeURIComponent(ussdCode)}`;

    // Create payment record with proper error handling
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        amount: parseInt(amount),
        phone_number: cleanPhone,
        trip_id,
        booking_id,
        ussd_code: ussdCode,
        ussd_link: ussdLink,
        reference: paymentRef,
        status: 'pending',
        description
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw new Error('Failed to create payment record');
    }

    // If this is for a trip, update trip status
    if (trip_id) {
      const { error: tripUpdateError } = await supabase
        .from('trips')
        .update({ 
          payment_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', trip_id);

      if (tripUpdateError) {
        console.warn('Trip update warning:', tripUpdateError);
      }
    }

    // Send confirmation via WhatsApp
    await supabase.functions.invoke('whatsapp-message-processor', {
      body: {
        phone: cleanPhone,
        message: `💳 Payment Request Generated!\n\nAmount: ${amount.toLocaleString()} RWF\nReference: ${paymentRef}\n\n📱 Dial: ${ussdCode}\n\nOr tap this link to pay: ${ussdLink}\n\nThank you for using easyMO! 🚗`,
        message_type: 'text'
      }
    });

    console.log('✅ Payment processed successfully:', payment.id);

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      amount,
      ussd_code: ussdCode,
      ussd_link: ussdLink,
      reference: paymentRef,
      instructions: `Dial ${ussdCode} to complete mobile money payment`,
      message: `💳 Payment link generated! Dial ${ussdCode} to pay ${amount.toLocaleString()} RWF`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Payment processing error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: "❌ Payment processing failed. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
