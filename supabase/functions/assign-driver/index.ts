import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const { order_id, pickup_location, delivery_location } = await req.json();
    
    if (!order_id) {
      throw new Error('Order ID is required');
    }

    console.log(`🚗 Assigning driver for order ${order_id}`);

    // Find nearest available driver
    const { data: availableDrivers, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_online', true)
      .limit(1);

    if (driverError) {
      throw new Error('Failed to find drivers');
    }

    if (!availableDrivers || availableDrivers.length === 0) {
      console.log('⚠️ No drivers available');
      return new Response(JSON.stringify({
        success: false,
        error: 'No drivers available at the moment'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assignedDriver = availableDrivers[0];

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert({
        order_id: order_id,
        driver_id: assignedDriver.id,
        status: 'assigned',
        pickup_eta: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
      })
      .select()
      .single();

    if (deliveryError) {
      throw new Error('Failed to create delivery');
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', order_id);

    console.log(`✅ Driver ${assignedDriver.id} assigned to order ${order_id}`);

    return new Response(JSON.stringify({
      success: true,
      delivery_id: delivery.id,
      driver: {
        id: assignedDriver.id,
        vehicle_plate: assignedDriver.vehicle_plate
      },
      pickup_eta: delivery.pickup_eta,
      status: 'assigned'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Driver assignment error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});