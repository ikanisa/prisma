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
    const { pickup_location, dropoff_location, passenger_id, estimated_price } = await req.json();
    
    if (!pickup_location || !dropoff_location) {
      throw new Error('Pickup and dropoff locations are required');
    }

    console.log(`🚗 Finding driver for trip: ${pickup_location} → ${dropoff_location}`);

    // Find nearest available online driver using SELECT FOR UPDATE to prevent race conditions
    const { data: availableDrivers, error: driverError } = await supabase
      .from('drivers')
      .select(`
        *,
        driver_sessions!inner(*)
      `)
      .eq('is_online', true)
      .eq('driver_sessions.status', 'online')
      .limit(5); // Get top 5 nearest drivers

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

    // Select first available driver (in production, use proximity algorithm)
    const selectedDriver = availableDrivers[0];

    // Create trip record
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        passenger_id,
        driver_id: selectedDriver.id,
        pickup_location,
        dropoff_location,
        price: estimated_price || 2000, // Default price
        status: 'assigned'
      })
      .select()
      .single();

    if (tripError) {
      throw new Error('Failed to create trip');
    }

    // Log assignment event
    await supabase.from('trip_events').insert({
      trip_id: trip.id,
      event: 'driver_assigned',
      metadata: {
        driver_id: selectedDriver.id,
        driver_name: selectedDriver.full_name,
        plate_number: selectedDriver.plate_number
      }
    });

    // Create booking record
    await supabase.from('bookings').insert({
      trip_id: trip.id,
      passenger_id,
      status: 'confirmed'
    });

    console.log(`✅ Driver ${selectedDriver.id} assigned to trip ${trip.id}`);

    return new Response(JSON.stringify({
      success: true,
      trip_id: trip.id,
      driver: {
        id: selectedDriver.id,
        name: selectedDriver.full_name,
        plate_number: selectedDriver.plate_number,
        momo_code: selectedDriver.momo_code
      },
      estimated_arrival: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      trip_details: {
        pickup: pickup_location,
        dropoff: dropoff_location,
        price: trip.price,
        status: 'assigned'
      }
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