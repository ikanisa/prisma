import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cart_id, buyer_phone, apply_vat = true } = await req.json();
    
    if (!cart_id) {
      throw new Error('Cart ID is required');
    }

    console.log('Generating quote for cart:', cart_id);

    // Initialize Supabase client
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get cart items with product details
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        products:product_id (
          name,
          description,
          price,
          unit,
          category
        )
      `)
      .eq('cart_id', cart_id);

    if (cartError) {
      throw new Error(`Failed to fetch cart items: ${cartError.message}`);
    }

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate totals
    let subtotal = 0;
    const lineItems = cartItems.map((item: any) => {
      const lineTotal = item.qty * item.unit_price;
      subtotal += lineTotal;
      
      return {
        product_name: item.products.name,
        quantity: item.qty,
        unit: item.products.unit,
        unit_price: item.unit_price,
        line_total: lineTotal,
        category: item.products.category
      };
    });

    // Apply VAT if requested (18% in Rwanda)
    const vatRate = apply_vat ? 0.18 : 0;
    const vatAmount = subtotal * vatRate;
    const total = subtotal + vatAmount;

    // Group items by category for better presentation
    const itemsByCategory = lineItems.reduce((acc: any, item: any) => {
      const category = item.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    // Generate quote response
    const quote = {
      cart_id,
      buyer_phone,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      currency: 'RWF',
      items_count: cartItems.length,
      line_items: lineItems,
      items_by_category: itemsByCategory,
      generated_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Update cart with total
    await supabase
      .from('carts')
      .update({ total })
      .eq('id', cart_id);

    console.log(`Generated quote: ${total} RWF for ${cartItems.length} items`);

    return new Response(
      JSON.stringify(quote),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in quote-engine:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});