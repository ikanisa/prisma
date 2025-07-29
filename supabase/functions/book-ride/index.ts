import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RideRequest {
  pickup: {
    lat: number;
    lng: number;
    address?: string;
  };
  dropoff: {
    lat: number;
    lng: number;
    address?: string;
  };
  pax: number;
  phoneNumber: string;
  estimatedFare?: number;
  rideType?: 'standard' | 'express' | 'scheduled';
  scheduledTime?: string;
}

interface RideResponse {
  success: boolean;
  bookingId: string;
  estimatedFare: number;
  estimatedDuration: number;
  driverInfo?: {
    name: string;
    phone: string;
    vehicle: string;
    rating: number;
  };
  status: string;
  pickupETA?: number;
  data?: any;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pickup, dropoff, pax = 1, phoneNumber, estimatedFare, rideType = 'standard', scheduledTime } = await req.json() as RideRequest;

    console.log('🛵 Booking ride:', { pickup, dropoff, pax, phoneNumber, rideType });

    // Validate input
    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
      throw new Error('Valid pickup and dropoff coordinates are required');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    if (pax < 1 || pax > 4) {
      throw new Error('Passenger count must be between 1 and 4');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate distance (simple haversine formula)
    const toRad = (value: number) => value * Math.PI / 180;
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRad(dropoff.lat - pickup.lat);
    const dLng = toRad(dropoff.lng - pickup.lng);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(pickup.lat)) * Math.cos(toRad(dropoff.lat)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers

    // Calculate fare based on distance and ride type
    const baseFare = 1000; // Base fare in RWF
    const perKmRate = rideType === 'express' ? 800 : 500;
    const calculatedFare = Math.round(baseFare + (distance * perKmRate));
    
    // Estimated duration (assuming 25 km/h average speed in city)
    const estimatedDurationMinutes = Math.round((distance / 25) * 60);

    // Generate booking ID
    const bookingId = crypto.randomUUID();

    // Create passenger intent
    const { data: passengerIntent, error: intentError } = await supabase
      .from('passenger_intents_spatial')
      .insert({
        passenger_phone: phoneNumber,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        pickup_address: pickup.address,
        dropoff_address: dropoff.address,
        passenger_count: pax,
        max_fare_rwf: estimatedFare || calculatedFare + 500,
        ride_type: rideType,
        scheduled_time: scheduledTime,
        status: 'open',
        metadata: {
          distance_km: distance,
          estimated_duration_minutes: estimatedDurationMinutes,
          booking_id: bookingId
        }
      })
      .select()
      .single();

    if (intentError) {
      throw new Error(`Failed to create ride request: ${intentError.message}`);
    }

    // Look for nearby drivers
    const { data: nearbyDrivers, error: driverError } = await supabase
      .from('driver_trips_spatial')
      .select(`
        *,
        drivers:driver_id (
          name,
          phone,
          vehicle_info,
          rating
        )
      `)
      .eq('status', 'active')
      .gte('available_seats', pax)
      .limit(5);

    let assignedDriver = null;
    let bookingStatus = 'searching';

    if (nearbyDrivers && nearbyDrivers.length > 0) {
      // Find the closest driver
      let closestDriver = null;
      let minDistance = Infinity;

      for (const driver of nearbyDrivers) {
        const driverDistance = Math.sqrt(
          Math.pow(driver.pickup_lat - pickup.lat, 2) + 
          Math.pow(driver.pickup_lng - pickup.lng, 2)
        );
        
        if (driverDistance < minDistance) {
          minDistance = driverDistance;
          closestDriver = driver;
        }
      }

      if (closestDriver && minDistance < 0.05) { // Within ~5km radius
        assignedDriver = {
          name: closestDriver.drivers?.name || 'Driver',
          phone: closestDriver.drivers?.phone || '',
          vehicle: closestDriver.drivers?.vehicle_info?.make || 'Motorcycle',
          rating: closestDriver.drivers?.rating || 4.5
        };
        bookingStatus = 'matched';

        // Create booking
        await supabase
          .from('bookings_spatial')
          .insert({
            passenger_intent_id: passengerIntent.id,
            driver_trip_id: closestDriver.id,
            status: 'pending',
            fare_rwf: calculatedFare
          });
      }
    }

    // Log tool execution
    await supabase
      .from('tool_execution_logs')
      .insert({
        user_phone: phoneNumber,
        tool_name: 'bookRide',
        tool_version: '1.0',
        input_params: { pickup, dropoff, pax, rideType },
        output_result: { 
          bookingId, 
          fare: calculatedFare, 
          distance, 
          status: bookingStatus,
          driver_assigned: !!assignedDriver 
        },
        execution_time_ms: Date.now() % 1000,
        success: true,
        context_metadata: {
          distance_km: distance,
          estimated_duration: estimatedDurationMinutes,
          nearby_drivers_count: nearbyDrivers?.length || 0
        }
      });

    const response: RideResponse = {
      success: true,
      bookingId,
      estimatedFare: calculatedFare,
      estimatedDuration: estimatedDurationMinutes,
      driverInfo: assignedDriver,
      status: bookingStatus,
      pickupETA: assignedDriver ? Math.round(minDistance * 2) : undefined, // ~2 min per km
      data: {
        distance_km: Math.round(distance * 100) / 100,
        passenger_intent_id: passengerIntent.id,
        ride_type: rideType,
        scheduled_time: scheduledTime,
        nearby_drivers: nearbyDrivers?.length || 0
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Ride booking error:', error);

    const errorResponse: RideResponse = {
      success: false,
      bookingId: '',
      estimatedFare: 0,
      estimatedDuration: 0,
      status: 'failed',
      error: error.message
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});