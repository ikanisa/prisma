import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tab_id, tip_amount, waiter_id } = await req.json();
    
    if (!tab_id || !tip_amount) {
      throw new Error('tab_id and tip_amount are required');
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update the tab with tip amount
    const { data: tab, error: tabError } = await supabase
      .from('bar_tabs')
      .update({ tip: tip_amount })
      .eq('id', tab_id)
      .select('*')
      .single();

    if (tabError) throw tabError;

    // If waiter_id is provided and we have a driver_wallet system for waiters,
    // we could allocate the tip to their wallet
    if (waiter_id) {
      // Check if waiter has a wallet (assuming waiters use the driver_wallet table)
      let { data: waiterWallet } = await supabase
        .from('driver_wallet')
        .select('*')
        .eq('driver_id', waiter_id)
        .single();

      if (!waiterWallet) {
        // Create wallet for waiter
        const { data: newWallet, error: walletError } = await supabase
          .from('driver_wallet')
          .insert({
            driver_id: waiter_id,
            balance: 0
          })
          .select('*')
          .single();

        if (walletError) {
          console.error('Could not create waiter wallet:', walletError);
        } else {
          waiterWallet = newWallet;
        }
      }

      // Add tip to waiter's balance (when tab is fully paid)
      if (waiterWallet && tab.status === 'closed') {
        await supabase
          .from('driver_wallet')
          .update({ 
            balance: waiterWallet.balance + tip_amount,
            updated_at: new Date().toISOString()
          })
          .eq('driver_id', waiter_id);

        console.log(`Added tip of ${tip_amount} RWF to waiter ${waiter_id}'s wallet`);
      }
    }

    // Create a tip transaction record
    const { data: tipRecord, error: tipError } = await supabase
      .from('bar_feedback')
      .insert({
        tab_id: tab_id,
        patron_id: tab.patron_id,
        feedback_text: `Tip: ${tip_amount} RWF`,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (tipError) {
      console.error('Could not record tip feedback:', tipError);
    }

    return new Response(JSON.stringify({
      success: true,
      tab: tab,
      tip_amount: tip_amount,
      message: `Tip of ${tip_amount} RWF added successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Tips handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});