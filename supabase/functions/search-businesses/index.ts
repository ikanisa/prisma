import { supabaseClient } from "./client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchBusinessesRequest {
  query: string
  category?: string
  location?: { lat: number; lng: number }
  radius_km?: number
  limit?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { query, category, location, radius_km = 5, limit = 10 }: SearchBusinessesRequest = await req.json()

    let businessQuery = supabase
      .from('businesses')
      .select(`
        id,
        name,
        address,
        category,
        phone_number,
        whatsapp_number,
        momo_code,
        rating,
        reviews_count,
        location_gps
      `)
      .eq('status', 'active')
      .limit(limit)

    // Apply category filter
    if (category) {
      businessQuery = businessQuery.eq('category', category)
    }

    // Apply text search
    if (query) {
      businessQuery = businessQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%`)
    }

    const { data: businesses, error } = await businessQuery

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to search businesses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate distances if location provided
    let results = businesses || []
    if (location && results.length > 0) {
      results = results
        .map(business => {
          let distance = null
          if (business.location_gps?.coordinates) {
            // Simple distance calculation (haversine approximation)
            const lat1 = location.lat
            const lng1 = location.lng
            const lat2 = business.location_gps.coordinates[1]
            const lng2 = business.location_gps.coordinates[0]
            
            const R = 6371 // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180
            const dLng = (lng2 - lng1) * Math.PI / 180
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            distance = R * c
          }
          
          return { ...business, distance_km: distance }
        })
        .filter(business => !business.distance_km || business.distance_km <= radius_km)
        .sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity))
    }

    return new Response(
      JSON.stringify({ 
        businesses: results,
        count: results.length,
        query_params: { query, category, location, radius_km, limit }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in search-businesses:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})