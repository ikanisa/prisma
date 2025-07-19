import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, order_type = 'pharmacy' } = await req.json();
    
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Assigning courier for order:', order_id);

    // Find available drivers (reuse existing logistics)
    const { data: availableDrivers, error: driversError } = await supabase
      .from('driver_sessions')
      .select(`
        driver_id,
        drivers!inner(
          id,
          full_name,
          momo_number,
          location_gps,
          driver_kind
        )
      `)
      .eq('status', 'online')
      .in('drivers.driver_kind', ['motorcycle', 'bicycle', 'scooter'])
      .limit(5);

    if (driversError || !availableDrivers || availableDrivers.length === 0) {
      console.log('No available drivers found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No available drivers',
          available_drivers: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select the first available driver (can be enhanced with location-based matching)
    const selectedDriver = availableDrivers[0];

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert({
        order_id,
        driver_id: selectedDriver.driver_id,
        status: 'assigned',
        mode: order_type,
        pickup_eta: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
      })
      .select()
      .single();

    if (deliveryError) {
      console.error('Delivery creation error:', deliveryError);
      return new Response(
        JSON.stringify({ error: 'Failed to assign courier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status based on order type
    const tableName = order_type === 'pharmacy' ? 'pharmacy_orders' : 'orders';
    await supabase
      .from(tableName)
      .update({ status: 'preparing' })
      .eq('id', order_id);

    return new Response(
      JSON.stringify({
        success: true,
        delivery_id: delivery.id,
        driver_id: selectedDriver.driver_id,
        driver_name: selectedDriver.drivers.full_name,
        pickup_eta: delivery.pickup_eta,
        status: delivery.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assign-courier function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});