import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intent, user_lat, user_lng, query, limit = 5 } = await req.json();
    
    console.log('Searching businesses with:', { intent, user_lat, user_lng, query, limit });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let searchQuery = supabase
      .from('businesses')
      .select(`
        id,
        name,
        address,
        phone_number,
        whatsapp_number,
        website,
        rating,
        reviews_count,
        location_gps,
        category,
        tags
      `)
      .eq('status', 'active')
      .limit(limit);

    // Apply intent-based filtering
    if (intent === 'health' || intent === 'pharmacy') {
      searchQuery = searchQuery.or('category.eq.pharmacy,tags.cs.{health,pharmacy,medical}');
    } else if (intent === 'bar' || intent === 'restaurant') {
      searchQuery = searchQuery.or('category.eq.bar,category.eq.restaurant,tags.cs.{bar,restaurant,food,drinks}');
    } else if (intent === 'hardware') {
      searchQuery = searchQuery.or('category.eq.hardware,tags.cs.{hardware,tools,construction}');
    } else if (intent === 'shop' || intent === 'commerce') {
      searchQuery = searchQuery.or('category.eq.retail,category.eq.shop,tags.cs.{shop,retail,store}');
    }

    // If query text provided, add text search
    if (query) {
      searchQuery = searchQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
    }

    const { data: businesses, error } = await searchQuery;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Calculate distances if user location provided
    let results = businesses || [];
    
    if (user_lat && user_lng && results.length > 0) {
      results = results.map(business => {
        let distance_km = null;
        
        // Extract coordinates from location_gps if available
        if (business.location_gps && typeof business.location_gps === 'object') {
          const coords = business.location_gps as any;
          if (coords.coordinates && Array.isArray(coords.coordinates)) {
            const [biz_lng, biz_lat] = coords.coordinates;
            // Calculate rough distance using Haversine formula
            const R = 6371; // Earth's radius in km
            const dLat = (biz_lat - user_lat) * Math.PI / 180;
            const dLng = (biz_lng - user_lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(user_lat * Math.PI / 180) * Math.cos(biz_lat * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            distance_km = Math.round((R * c) * 100) / 100; // Round to 2 decimal places
          }
        }
        
        return {
          ...business,
          distance_km
        };
      });

      // Sort by distance if available, otherwise keep original order
      results.sort((a, b) => {
        if (a.distance_km !== null && b.distance_km !== null) {
          return a.distance_km - b.distance_km;
        }
        if (a.distance_km !== null) return -1;
        if (b.distance_km !== null) return 1;
        return 0;
      });
    }

    console.log(`Found ${results.length} businesses for intent: ${intent}`);

    return new Response(JSON.stringify({
      success: true,
      businesses: results,
      total: results.length,
      intent,
      user_location: user_lat && user_lng ? { lat: user_lat, lng: user_lng } : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in search-businesses function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
