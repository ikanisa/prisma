import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driver_id, amount, method = 'momo' } = await req.json();
    
    if (!driver_id || !amount) {
      throw new Error('Driver ID and amount are required');
    }

    console.log(`💰 Generating USSD payout for driver ${driver_id}: ${amount} RWF (P2P only)`);

    // Get driver details
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*, driver_wallet!inner(*)')
      .eq('id', driver_id)
      .single();

    if (driverError || !driver) {
      throw new Error('Driver not found');
    }

    // Check wallet balance
    if (driver.driver_wallet[0].balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Generate USSD code via existing system (no actual payment processing)
    const paymentResponse = await supabase.functions.invoke('generate-payment', {
      body: {
        amount,
        phone: driver.momo_number || driver.momo_code,
        description: 'Driver Payout'
      }
    });

    const { data: paymentData } = paymentResponse;

    if (!paymentData.success) {
      throw new Error('Failed to generate payment');
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        driver_id,
        amount,
        status: 'processing',
        momo_txn_id: paymentData.reference
      })
      .select()
      .single();

    if (payoutError) {
      throw new Error('Failed to create payout record');
    }

    // Deduct from wallet
    const { error: walletError } = await supabase
      .from('driver_wallet')
      .update({
        balance: driver.driver_wallet[0].balance - amount
      })
      .eq('driver_id', driver_id);

    if (walletError) {
      throw new Error('Failed to update wallet balance');
    }

    console.log(`✅ Payout initiated for driver ${driver_id}`);

    return new Response(JSON.stringify({
      success: true,
      payout_id: payout.id,
      amount,
      ussd_code: paymentData.ussd_code,
      ussd_link: paymentData.ussd_link,
      reference: paymentData.reference,
      instructions: `USSD code generated for ${amount} RWF payout. Complete P2P transfer outside system.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Driver payout error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});