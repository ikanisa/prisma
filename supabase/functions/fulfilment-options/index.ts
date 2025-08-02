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
    const { order_id, business_category } = await req.json();
    
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get order details with business info
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        carts(
          *,
          businesses(name, category)
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError) throw orderError;

    const business = order.carts.businesses;
    const category = business_category || business.category;

    let fulfilmentOptions: any = {};
    let prompt = "";

    switch (category) {
      case 'bar':
        // Bar customers choose table numbers
        fulfilmentOptions = {
          type: 'quick_replies',
          prompt: 'Which table are you at?',
          options: [
            { id: 'table_1', title: 'Table 1' },
            { id: 'table_2', title: 'Table 2' },
            { id: 'table_3', title: 'Table 3' },
            { id: 'table_4', title: 'Table 4' },
            { id: 'table_5', title: 'Table 5' },
            { id: 'table_other', title: 'Other (specify)' }
          ]
        };
        prompt = "🍺 Please select your table number:";
        break;

      case 'pharmacy':
        // Pharmacy offers pickup vs delivery
        fulfilmentOptions = {
          type: 'quick_replies',
          prompt: 'How would you like to receive your medication?',
          options: [
            { id: 'pickup', title: '🚶 Pickup (Free)' },
            { id: 'delivery', title: '🏍️ Delivery (500 RWF)' }
          ]
        };
        prompt = "💊 How would you like to receive your order?";
        break;

      case 'hardware':
        // Hardware offers delivery or self-pickup
        fulfilmentOptions = {
          type: 'quick_replies',
          prompt: 'Delivery method for your hardware items:',
          options: [
            { id: 'delivery_moto', title: '🏍️ Moto Delivery (1000 RWF)' },
            { id: 'delivery_truck', title: '🚛 Truck Delivery (3000 RWF)' },
            { id: 'pickup', title: '🚶 Self Pickup (Free)' }
          ]
        };
        prompt = "🪚 Choose your delivery option:";
        break;

      case 'produce':
        // Produce offers market pickup or home delivery
        fulfilmentOptions = {
          type: 'quick_replies',
          prompt: 'How would you like to receive your fresh produce?',
          options: [
            { id: 'market_pickup', title: '🏪 Market Pickup (Free)' },
            { id: 'home_delivery', title: '🏠 Home Delivery (800 RWF)' }
          ]
        };
        prompt = "🍎 Choose pickup/delivery:";
        break;

      default:
        // Generic fulfillment options
        fulfilmentOptions = {
          type: 'quick_replies',
          prompt: 'Choose your fulfillment option:',
          options: [
            { id: 'pickup', title: '🚶 Pickup' },
            { id: 'delivery', title: '🏍️ Delivery' }
          ]
        };
        prompt = "🏪 How would you like to receive your order?";
        break;
    }

    // Also provide estimated times based on business category
    const estimatedTimes = {
      'bar': '5-10 minutes',
      'pharmacy': '15-30 minutes',
      'hardware': '30-60 minutes',
      'produce': '20-45 minutes'
    };

    const response = {
      order_id,
      business_name: business.name,
      category,
      prompt,
      fulfilment_options: fulfilmentOptions,
      estimated_time: estimatedTimes[category] || '30-45 minutes',
      instructions: `After selecting your option, you'll receive an ETA and tracking details.`
    };

    // Log the fulfilment options request
    await supabaseClient
      .from('agent_execution_log')
      .insert({
        function_name: 'fulfilment-options',
        input_data: { order_id, business_category: category },
        success_status: true,
        execution_time_ms: Date.now() % 1000,
        model_used: 'fulfilment-api'
      });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fulfilment-options:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});