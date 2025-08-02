import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopper_id, items, delivery_address, delivery_eta } = await req.json();
    
    if (!shopper_id || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shopper_id, items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating pharmacy order for shopper:', shopper_id);

    // Calculate totals
    let total_amount = 0;
    const delivery_fee = 500; // Fixed delivery fee
    
    // Validate products and calculate total
    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('price, stock_qty')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        return new Response(
          JSON.stringify({ error: `Product not found: ${item.product_id}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (product.stock_qty < item.qty) {
        return new Response(
          JSON.stringify({ error: `Insufficient stock for product: ${item.product_id}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      total_amount += product.price * item.qty;
    }

    // Begin transaction: create order + items
    const { data: order, error: orderError } = await supabase
      .from('pharmacy_orders')
      .insert({
        shopper_id,
        total_amount,
        delivery_fee,
        status: 'draft',
        delivery_address,
        delivery_eta
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      qty: item.qty,
      unit_price: item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('pharmacy_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items error:', itemsError);
      // Rollback - delete the order
      await supabase.from('pharmacy_orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create order items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reserve stock quantities
    for (const item of items) {
      await supabase
        .from('products')
        .update({ 
          stock_qty: `stock_qty - ${item.qty}` 
        })
        .eq('id', item.product_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        total_amount: total_amount + delivery_fee,
        delivery_fee,
        status: order.status,
        created_at: order.created_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-pharmacy-order function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});