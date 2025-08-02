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
    const { origin, destination, time_of_day } = await req.json();
    
    if (!origin || !destination) {
      throw new Error('Origin and destination coordinates are required');
    }

    console.log(`💰 Calculating fare from ${origin} to ${destination}`);

    // Calculate distance using Haversine formula
    const distance = calculateDistance(origin, destination);
    
    // Base fare calculation (Rwanda RWF)
    const baseFare = 500; // Base fare in RWF
    const perKmRate = 300; // Rate per km
    let fare = baseFare + (distance * perKmRate);
    
    // Time-based surge pricing
    const currentHour = time_of_day || new Date().getHours();
    let surgeMultiplier = 1.0;
    
    // Peak hours surge (7-9 AM, 5-7 PM)
    if ((currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19)) {
      surgeMultiplier = 1.3;
    }
    
    // Late night surge (10 PM - 5 AM)
    if (currentHour >= 22 || currentHour <= 5) {
      surgeMultiplier = 1.5;
    }
    
    fare = Math.round(fare * surgeMultiplier);
    
    // Minimum fare
    fare = Math.max(fare, 800);
    
    // Check driver availability in area
    const { data: nearbyDrivers } = await supabase
      .from('driver_sessions')
      .select('driver_id, last_location')
      .eq('status', 'online')
      .not('last_location', 'is', null);
    
    const availableDrivers = nearbyDrivers?.filter(driver => {
      if (!driver.last_location) return false;
      const driverLocation = parseLocation(driver.last_location);
      return calculateDistance(origin, driverLocation) <= 10; // Within 10km
    }) || [];

    console.log(`✅ Fare calculated: ${fare} RWF, ${availableDrivers.length} drivers nearby`);

    return new Response(JSON.stringify({
      success: true,
      fare_estimate: fare,
      distance_km: Math.round(distance * 10) / 10,
      available_drivers: availableDrivers.length,
      surge_multiplier: surgeMultiplier,
      eta_minutes: Math.ceil(distance * 3), // Rough ETA estimate
      currency: 'RWF'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Fare estimation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function parseLocation(location: any): [number, number] {
  // Handle PostGIS geometry format
  if (location.coordinates) {
    return [location.coordinates[1], location.coordinates[0]]; // [lat, lng]
  }
  return [0, 0];
}