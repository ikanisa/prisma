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
    const { 
      passenger_id, 
      origin, 
      destination, 
      origin_address, 
      destination_address,
      fare_estimate 
    } = await req.json();
    
    if (!passenger_id || !origin || !destination) {
      throw new Error('Passenger ID, origin, and destination are required');
    }

    console.log(`🚗 Creating ride request for passenger ${passenger_id}`);

    // Start transaction
    const { data: rideRequest, error: rideError } = await supabase
      .from('ride_requests')
      .insert({
        passenger_id,
        origin: `POINT(${origin[1]} ${origin[0]})`, // PostGIS format [lng, lat]
        destination: `POINT(${destination[1]} ${destination[0]})`,
        origin_address,
        destination_address,
        fare_estimate,
        status: 'pending'
      })
      .select()
      .single();

    if (rideError) {
      console.error('Ride request creation error:', rideError);
      throw new Error('Failed to create ride request');
    }

    console.log(`✅ Ride request created: ${rideRequest.id}`);

    // Try to assign a driver immediately
    const assignResponse = await supabase.functions.invoke('assign-driver', {
      body: {
        ride_request_id: rideRequest.id,
        origin,
        destination,
        passenger_id
      }
    });

    if (assignResponse.data?.success) {
      console.log(`🛵 Driver assigned to ride ${rideRequest.id}`);
      
      // Update ride request status
      await supabase
        .from('ride_requests')
        .update({ 
          status: 'matched',
          matched_at: new Date().toISOString()
        })
        .eq('id', rideRequest.id);

      return new Response(JSON.stringify({
        success: true,
        ride_request_id: rideRequest.id,
        status: 'matched',
        driver: assignResponse.data.driver,
        trip_id: assignResponse.data.trip_id,
        eta_minutes: assignResponse.data.eta_minutes,
        message: 'Driver found and assigned!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log(`⏳ No driver available for ride ${rideRequest.id}, queued`);
      
      // Set expiration (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await supabase
        .from('ride_requests')
        .update({ expired_at: expiresAt.toISOString() })
        .eq('id', rideRequest.id);

      return new Response(JSON.stringify({
        success: true,
        ride_request_id: rideRequest.id,
        status: 'pending',
        message: 'Looking for available drivers...',
        expires_at: expiresAt.toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Create ride error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});