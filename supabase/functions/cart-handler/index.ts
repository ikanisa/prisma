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
    const { action, buyer_phone, vendor_id, product_id, qty, unit_price } = await req.json();
    
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let response;

    switch (action) {
      case 'get_or_create_cart':
        // Find existing open cart or create new one
        let { data: existingCart } = await supabaseClient
          .from('carts')
          .select('*')
          .eq('buyer_phone', buyer_phone)
          .eq('vendor_id', vendor_id)
          .eq('status', 'open')
          .single();

        if (!existingCart) {
          const { data: newCart, error } = await supabaseClient
            .from('carts')
            .insert({
              buyer_phone,
              vendor_id,
              status: 'open',
              total: 0
            })
            .select()
            .single();

          if (error) throw error;
          existingCart = newCart;
        }

        response = { cart: existingCart };
        break;

      case 'add_item':
        // Get or create cart first
        const { cart } = await fetch(`${req.url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_or_create_cart', buyer_phone, vendor_id })
        }).then(r => r.json());

        // Check if item already exists in cart
        const { data: existingItem } = await supabaseClient
          .from('cart_items')
          .select('*')
          .eq('cart_id', cart.id)
          .eq('product_id', product_id)
          .single();

        if (existingItem) {
          // Update quantity
          const { data: updatedItem, error } = await supabaseClient
            .from('cart_items')
            .update({
              qty: existingItem.qty + qty,
              unit_price
            })
            .eq('id', existingItem.id)
            .select()
            .single();

          if (error) throw error;
          response = { item: updatedItem };
        } else {
          // Add new item
          const { data: newItem, error } = await supabaseClient
            .from('cart_items')
            .insert({
              cart_id: cart.id,
              product_id,
              qty,
              unit_price
            })
            .select()
            .single();

          if (error) throw error;
          response = { item: newItem };
        }
        break;

      case 'remove_item':
        const { error: removeError } = await supabaseClient
          .from('cart_items')
          .delete()
          .eq('product_id', product_id)
          .eq('cart_id', (await supabaseClient
            .from('carts')
            .select('id')
            .eq('buyer_phone', buyer_phone)
            .eq('vendor_id', vendor_id)
            .eq('status', 'open')
            .single()).data?.id);

        if (removeError) throw removeError;
        response = { success: true };
        break;

      case 'get_cart_summary':
        // Get cart with items and product details
        const { data: cartData, error: cartError } = await supabaseClient
          .from('carts')
          .select(`
            *,
            cart_items(
              *,
              products(name, unit)
            ),
            businesses(name, category)
          `)
          .eq('buyer_phone', buyer_phone)
          .eq('vendor_id', vendor_id)
          .eq('status', 'open')
          .single();

        if (cartError && cartError.code !== 'PGRST116') throw cartError;

        if (!cartData) {
          response = { cart: null, items: [], total: 0 };
        } else {
          // Format cart summary for WhatsApp
          const items = cartData.cart_items || [];
          const business = cartData.businesses;
          
          let summary = `🛒 Your Cart (${business?.name})\n`;
          summary += '──────────────────────\n';
          
          items.forEach((item: any) => {
            summary += `${item.qty} x ${item.products.name}  ${(item.qty * item.unit_price).toLocaleString()} RWF\n`;
          });
          
          summary += '——————————————\n';
          summary += `Total                ${cartData.total?.toLocaleString()} RWF\n`;
          summary += '──────────────────────\n';
          summary += '✅ Pay MoMo    ✏️ Edit    🗑 Clear';

          response = {
            cart: cartData,
            items,
            summary,
            total: cartData.total
          };
        }
        break;

      case 'clear_cart':
        const { error: clearError } = await supabaseClient
          .from('carts')
          .update({ status: 'abandoned' })
          .eq('buyer_phone', buyer_phone)
          .eq('vendor_id', vendor_id)
          .eq('status', 'open');

        if (clearError) throw clearError;
        response = { success: true };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log the cart operation
    await supabaseClient
      .from('agent_execution_log')
      .insert({
        function_name: 'cart-handler',
        input_data: { action, buyer_phone, vendor_id, product_id, qty },
        success_status: true,
        execution_time_ms: Date.now() % 1000,
        model_used: 'cart-api'
      });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cart-handler:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});