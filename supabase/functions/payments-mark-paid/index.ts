import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarkPaidRequest {
  payment_id: string;
  confirmation_note?: string;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { payment_id, confirmation_note, user_id }: MarkPaidRequest = await req.json();

    if (!payment_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'payment_id is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log execution start
    await supabase.from('agent_execution_log').insert({
      function_name: 'payments-mark-paid',
      input_data: { payment_id, confirmation_note, user_id },
      timestamp: new Date().toISOString(),
    });

    const start_time = Date.now();

    // Verify payment exists and get details
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (fetchError || !payment) {
      throw new Error('Payment not found');
    }

    // Check if payment is already paid
    if (payment.status === 'paid') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Payment is already marked as paid'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark payment as paid using the database function
    const { data: result, error: markPaidError } = await supabase.rpc('payments_mark_paid', {
      p_payment_id: payment_id,
      p_confirmation_note: confirmation_note || null,
    });

    if (markPaidError || !result) {
      console.error('Error marking payment as paid:', markPaidError);
      throw new Error('Failed to mark payment as paid');
    }

    // Get updated payment details
    const { data: updatedPayment, error: updatedFetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (updatedFetchError) {
      console.error('Error fetching updated payment:', updatedFetchError);
    }

    const execution_time = Date.now() - start_time;

    // Log successful execution
    await supabase.from('agent_execution_log').insert({
      function_name: 'payments-mark-paid',
      input_data: { payment_id, confirmation_note, user_id },
      success_status: true,
      execution_time_ms: execution_time,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        payment: updatedPayment || payment,
        marked_paid: true,
        confirmation_note: confirmation_note,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in payments-mark-paid function:', error);

    // Log error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('agent_execution_log').insert({
      function_name: 'payments-mark-paid',
      success_status: false,
      error_details: error.message,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});