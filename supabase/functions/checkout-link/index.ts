import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cart_id, buyer_phone } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get cart details with business info
    const { data: cart, error: cartError } = await supabaseClient
      .from('carts')
      .select(`
        *,
        businesses(name, momo_code)
      `)
      .eq('id', cart_id)
      .single();

    if (cartError) throw cartError;

    if (!cart || cart.status !== 'open') {
      throw new Error('Cart not found or not open');
    }

    // Create order from cart
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        cart_id: cart.id,
        status: 'pending',
        fulfilment_mode: 'pending_selection'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        order_id: order.id,
        amount: Math.round(cart.total), // Ensure integer for RWF
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Generate payment details
    const business = cart.businesses;
    const amountRWF = Math.round(cart.total);
    
    // MTN MoMo USSD code format: *182*6*1*[merchant_code]*[amount]*[reference]#
    const ussdCode = `*182*6*1*${business.momo_code}*${amountRWF}*${payment.id.slice(-8)}#`;
    const ussdLink = `tel:${ussdCode}`;
    
    // QR Code URL (would integrate with actual QR service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ussdCode)}`;

    // Update cart status to paid (will be confirmed by webhook)
    await supabaseClient
      .from('carts')
      .update({ status: 'paid' })
      .eq('id', cart.id);

    // Update payment with USSD details
    await supabaseClient
      .from('payments')
      .update({
        ussd_code: ussdCode,
        qr_code_url: qrCodeUrl,
        ussd_link: ussdLink
      })
      .eq('id', payment.id);

    const response = {
      order_id: order.id,
      payment_id: payment.id,
      amount: amountRWF,
      currency: 'RWF',
      ussd_code: ussdCode,
      ussd_link: ussdLink,
      qr_code_url: qrCodeUrl,
      instructions: {
        ussd: `Dial ${ussdCode} to pay ${amountRWF} RWF`,
        qr: "Scan QR code with your mobile banking app",
        fallback: "Send screenshot of payment confirmation"
      },
      business_name: business.name
    };

    // Log the checkout
    await supabaseClient
      .from('agent_execution_log')
      .insert({
        function_name: 'checkout-link',
        input_data: { cart_id, buyer_phone, amount: amountRWF },
        success_status: true,
        execution_time_ms: Date.now() % 1000,
        model_used: 'payment-api'
      });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in checkout-link:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});