import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency = 'RWF', phone, description } = await req.json();
    
    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required');
    }

    if (!phone) {
      throw new Error('Phone number is required');
    }

    console.log('Creating MoMo payment link:', { amount, currency, phone, description });

    // Generate unique transaction ID
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // For now, we'll create a USSD-style string that can be used for payments
    // In Rwanda, MoMo typically uses USSD codes like *182*8*1# for Airtel Money
    // This would need to be integrated with actual MoMo APIs in production
    
    const normalizedPhone = phone.replace(/\D/g, ''); // Remove non-digits
    
    // Create a payment-like USSD string (this is a mock implementation)
    // In real implementation, this would call actual MoMo API
    const ussdCode = `*182*8*1*${amount}*${normalizedPhone}#`;
    
    // Store payment session in database
    const paymentData = {
      session_id: txId,
      user_phone: normalizedPhone,
      amount: parseInt(amount),
      currency: currency,
      payment_method: 'momo',
      status: 'pending',
      description: description || `Payment of ${amount} ${currency}`,
      ussd_code: ussdCode,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      metadata: {
        created_via: 'create-momo-payment-link',
        user_agent: req.headers.get('user-agent') || 'unknown'
      }
    };

    const { data: paymentSession, error: paymentError } = await supabase
      .from('payment_sessions')
      .insert([paymentData])
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment session: ${paymentError.message}`);
    }

    // Also create entry in payments table for tracking
    const paymentsData = {
      id: txId,
      user_phone: normalizedPhone,
      amount: parseInt(amount),
      currency: currency,
      payment_method: 'momo',
      status: 'pending',
      description: description || `Payment of ${amount} ${currency}`,
      metadata: {
        ussd_code: ussdCode,
        payment_session_id: paymentSession.id,
        created_via: 'create-momo-payment-link'
      }
    };

    const { error: paymentsInsertError } = await supabase
      .from('payments')
      .insert([paymentsData]);

    if (paymentsInsertError) {
      console.warn('Failed to create payment record:', paymentsInsertError.message);
    }

    console.log('MoMo payment link created:', { txId, amount, currency, ussdCode });

    return new Response(JSON.stringify({
      success: true,
      txId,
      ussd: ussdCode,
      amount: parseInt(amount),
      currency,
      phone: normalizedPhone,
      expires_at: paymentData.expires_at,
      instructions: `Dial ${ussdCode} on your phone to complete the payment of ${amount} ${currency}`,
      session_id: paymentSession.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-momo-payment-link function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});