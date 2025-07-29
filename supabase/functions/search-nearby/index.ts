import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waId, domain, radiusKm = 5, phoneNumber } = await req.json();
    
    console.log('🔍 Searching nearby', { waId, phoneNumber, domain, radiusKm });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const userId = waId || phoneNumber;
    
    // Get user's latest location
    const { data: locationData, error: locationError } = await supabase
      .from('user_locations')
      .select('lat, lng')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (locationError || !locationData) {
      return new Response(
        JSON.stringify({ error: 'no_location', message: 'User location not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lat, lng } = locationData;
    
    let results = [];
    
    if (domain === 'driver' || domain === 'drivers') {
      // Search for nearby drivers
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select(`
          id,
          name,
          phone_number,
          whatsapp_number,
          status,
          location_gps,
          vehicle_type
        `)
        .eq('status', 'active')
        .limit(10);

      if (!error && drivers) {
        // Calculate distances and filter by radius
        results = drivers
          .map(driver => {
            if (driver.location_gps) {
              const distance = calculateDistance(lat, lng, driver.location_gps.lat, driver.location_gps.lng);
              return {
                ...driver,
                distance: Math.round(distance * 10) / 10, // Round to 1 decimal
                wa_number: driver.whatsapp_number || driver.phone_number
              };
            }
            return null;
          })
          .filter(driver => driver && driver.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);
      }
    } else if (domain === 'pharmacy' || domain === 'pharmacies') {
      // Search for nearby pharmacies
      const { data: pharmacies, error } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          phone_number,
          whatsapp_number,
          address,
          location_gps,
          category
        `)
        .eq('status', 'active')
        .ilike('category', '%pharmacy%')
        .limit(10);

      if (!error && pharmacies) {
        // Calculate distances and filter by radius
        results = pharmacies
          .map(pharmacy => {
            if (pharmacy.location_gps) {
              const distance = calculateDistance(lat, lng, pharmacy.location_gps.lat, pharmacy.location_gps.lng);
              return {
                ...pharmacy,
                distance: Math.round(distance * 10) / 10,
                wa_number: pharmacy.whatsapp_number || pharmacy.phone_number
              };
            }
            return null;
          })
          .filter(pharmacy => pharmacy && pharmacy.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);
      }
    } else {
      // Search for nearby businesses
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          phone_number,
          whatsapp_number,
          address,
          location_gps,
          category
        `)
        .eq('status', 'active')
        .limit(10);

      if (!error && businesses) {
        results = businesses
          .map(business => {
            if (business.location_gps) {
              const distance = calculateDistance(lat, lng, business.location_gps.lat, business.location_gps.lng);
              return {
                ...business,
                distance: Math.round(distance * 10) / 10,
                wa_number: business.whatsapp_number || business.phone_number
              };
            }
            return null;
          })
          .filter(business => business && business.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);
      }
    }

    console.log(`✅ Found ${results.length} nearby ${domain}`, { radiusKm });
    
    return new Response(
      JSON.stringify({ 
        success: true,
        domain,
        radius_km: radiusKm,
        user_location: { lat, lng },
        results,
        count: results.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error in search-nearby:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}