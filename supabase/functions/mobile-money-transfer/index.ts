import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  amount: number;
  to_phone: string;
  from_user_id: string;
  description?: string;
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

    const { amount, to_phone, from_user_id, description }: TransferRequest = await req.json();

    // Validate input
    if (!amount || !to_phone || !from_user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, to_phone, from_user_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (amount <= 0 || amount > 1000000) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Must be between 1 and 1,000,000 RWF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate phone number format
    if (!/^07\d{8}$/.test(to_phone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format. Use 07XXXXXXXX' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get sender user details
    const { data: fromUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', from_user_id)
      .single();

    if (userError || !fromUser) {
      return new Response(
        JSON.stringify({ error: 'Sender user not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if sender has sufficient credits
    if (fromUser.credits < amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          available: fromUser.credits,
          required: amount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate transfer reference
    const reference = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create transfer record
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        from_user_id: from_user_id,
        to_phone: to_phone,
        amount: amount,
        currency: 'RWF',
        reference: reference,
        status: 'processing',
        description: description || `Transfer to ${to_phone}`,
        metadata: {
          initiated_at: new Date().toISOString(),
          from_phone: fromUser.phone,
          channel: 'whatsapp'
        }
      })
      .select()
      .single();

    if (transferError) {
      console.error('Transfer creation error:', transferError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transfer record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Deduct credits from sender
    const { error: deductError } = await supabase
      .from('users')
      .update({ 
        credits: fromUser.credits - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', from_user_id);

    if (deductError) {
      console.error('Credit deduction error:', deductError);
      // Rollback transfer
      await supabase.from('transfers').delete().eq('id', transfer.id);
      return new Response(
        JSON.stringify({ error: 'Failed to process payment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Find or create recipient user
    let { data: toUser } = await supabase
      .from('users')
      .select('*')
      .eq('phone', to_phone)
      .single();

    if (!toUser) {
      // Create recipient user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          phone: to_phone,
          momo_code: to_phone,
          credits: amount // Add the received amount
        })
        .select()
        .single();

      if (createError) {
        console.error('Recipient creation error:', createError);
        // Note: In a real system, you'd want to rollback the sender's deduction
        return new Response(
          JSON.stringify({ error: 'Failed to process recipient' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      toUser = newUser;
    } else {
      // Add credits to existing recipient
      const { error: creditError } = await supabase
        .from('users')
        .update({ 
          credits: (toUser.credits || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', toUser.id);

      if (creditError) {
        console.error('Credit addition error:', creditError);
        return new Response(
          JSON.stringify({ error: 'Failed to credit recipient' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Update transfer status to completed
    await supabase
      .from('transfers')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        to_user_id: toUser.id
      })
      .eq('id', transfer.id);

    // Log the transaction
    await supabase.from('transaction_logs').insert([
      {
        user_id: from_user_id,
        type: 'debit',
        amount: amount,
        balance_after: fromUser.credits - amount,
        reference: reference,
        description: `Transfer to ${to_phone}`
      },
      {
        user_id: toUser.id,
        type: 'credit',
        amount: amount,
        balance_after: (toUser.credits || 0) + amount,
        reference: reference,
        description: `Transfer from ${fromUser.phone}`
      }
    ]);

    // Send notification to recipient (in real system, this would be via SMS/WhatsApp)
    await supabase.functions.invoke('send-notification', {
      body: {
        phone: to_phone,
        message: `You received ${amount.toLocaleString()} RWF from ${fromUser.phone}. Reference: ${reference}`,
        type: 'transfer_received'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        reference: reference,
        amount: amount,
        from: fromUser.phone,
        to: to_phone,
        status: 'completed',
        completed_at: new Date().toISOString(),
        remaining_balance: fromUser.credits - amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Mobile money transfer error:', error);
    return new Response(
      JSON.stringify({ error: 'Transfer failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});