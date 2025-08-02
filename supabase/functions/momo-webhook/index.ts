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
    const { 
      transaction_id, 
      payment_id, 
      status, 
      amount, 
      phone_number 
    } = await req.json();
    
    console.log(`📱 MoMo webhook: ${transaction_id} - ${status}`);

    if (status === 'completed' || status === 'successful') {
      // Find the payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*, orders(*)')
        .eq('id', payment_id)
        .single();

      if (paymentError || !payment) {
        console.error('Payment not found:', payment_id);
        throw new Error('Payment record not found');
      }

      // Update payment status
      await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          paid_at: new Date().toISOString(),
          momo_tx: transaction_id
        })
        .eq('id', payment_id);

      // Find related trip and mark as paid
      if (payment.order_id) {
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', payment.order_id)
          .single();

        if (order) {
          // Find trip for this order
          const { data: trip } = await supabase
            .from('trips')
            .select('*, drivers(*)')
            .eq('id', order.trip_id)
            .single();

          if (trip) {
            // Mark trip as paid
            await supabase
              .from('trips')
              .update({ passenger_paid: true })
              .eq('id', trip.id);

            // Credit driver wallet
            if (trip.driver_id) {
              const driverEarnings = Math.round(amount * 0.85); // Driver gets 85%
              
              await supabase
                .from('driver_wallet')
                .update({ 
                  balance: supabase.raw('balance + ?', [driverEarnings])
                })
                .eq('driver_id', trip.driver_id);

              console.log(`💰 Driver ${trip.driver_id} credited ${driverEarnings} RWF`);
            }

            console.log(`✅ Trip ${trip.id} marked as paid`);
          }
        }
      }

      // Send notification to passenger via WhatsApp
      // This would integrate with your WhatsApp webhook system
      await notifyPaymentSuccess(phone_number, amount, transaction_id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Payment processed successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (status === 'failed' || status === 'cancelled') {
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment_id);

      console.log(`❌ Payment ${payment_id} failed`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Payment failure recorded'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook received'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ MoMo webhook error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function notifyPaymentSuccess(phoneNumber: string, amount: number, transactionId: string) {
  try {
    // This would integrate with your WhatsApp messaging system
    console.log(`📨 Sending payment confirmation to ${phoneNumber}: ${amount} RWF paid (${transactionId})`);
    
    // You would call your WhatsApp webhook here to send a confirmation message
    // Example: "✅ Payment confirmed! ${amount} RWF received. Thank you for using easyMO!"
    
  } catch (error) {
    console.error('Failed to send payment notification:', error);
  }
}