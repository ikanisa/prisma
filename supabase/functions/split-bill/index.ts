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
    const { patron_whatsapp, bar_id, split_count, phone_numbers } = await req.json();
    
    if (!patron_whatsapp || !bar_id || !split_count) {
      throw new Error('patron_whatsapp, bar_id, and split_count are required');
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current tab
    const { data: patron } = await supabase
      .from('bar_patrons')
      .select('id')
      .eq('whatsapp', patron_whatsapp)
      .single();

    if (!patron) {
      throw new Error('Patron not found');
    }

    const { data: tab } = await supabase
      .from('bar_tabs')
      .select('*')
      .eq('patron_id', patron.id)
      .eq('bar_id', bar_id)
      .in('status', ['open', 'pending_payment'])
      .single();

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Calculate split amount
    const splitAmount = Math.ceil(tab.total / split_count);
    const lastAmount = tab.total - (splitAmount * (split_count - 1));

    // Create split payment records
    const splitPayments = [];
    
    for (let i = 0; i < split_count; i++) {
      const amount = i === split_count - 1 ? lastAmount : splitAmount;
      const phone = phone_numbers ? phone_numbers[i] : patron_whatsapp;
      
      // Generate MoMo reference
      const momoRef = `BAR${tab.id.slice(-8)}${i + 1}`;
      
      splitPayments.push({
        tab_id: tab.id,
        whatsapp: phone || patron_whatsapp,
        amount: amount,
        momo_ref: momoRef,
        status: 'pending'
      });
    }

    const { data: insertedSplits, error } = await supabase
      .from('split_payments')
      .insert(splitPayments)
      .select('*');

    if (error) throw error;

    // Update tab status
    await supabase
      .from('bar_tabs')
      .update({ status: 'pending_payment' })
      .eq('id', tab.id);

    // Generate payment instructions
    const paymentInstructions = insertedSplits.map((split: any, index: number) => {
      const ussdCode = `*182*7*1*${split.momo_ref}*${split.amount}#`;
      const deepLink = `momo://pay?ref=${split.momo_ref}&amount=${split.amount}`;
      
      return {
        split_id: split.id,
        phone: split.whatsapp,
        amount: split.amount,
        momo_ref: split.momo_ref,
        ussd_code: ussdCode,
        deep_link: deepLink,
        share_number: index + 1
      };
    });

    console.log(`Created ${split_count} split payments for tab ${tab.id}`);

    return new Response(JSON.stringify({
      tab_id: tab.id,
      total_amount: tab.total,
      split_count: split_count,
      payments: paymentInstructions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Split bill error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});