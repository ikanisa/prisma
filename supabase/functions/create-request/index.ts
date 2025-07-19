import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { passenger_id, pickup_lng, pickup_lat, drop_lng, drop_lat, desired_time, seats, max_budget } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create ride request
    const { data: request, error: requestError } = await supabase
      .from('ride_requests')
      .insert({
        passenger_id,
        pickup_point: `POINT(${pickup_lng} ${pickup_lat})`,
        dropoff_point: `POINT(${drop_lng} ${drop_lat})`,
        desired_time,
        max_budget,
        seats_needed: seats || 1
      })
      .select('*')
      .single()

    if (requestError) {
      throw new Error(`Failed to create request: ${requestError.message}`)
    }

    // Find nearby trips within 3km
    const { data: nearbyTrips, error: tripsError } = await supabase
      .rpc('find_nearby_trips', {
        pickup_lng,
        pickup_lat,
        max_distance_km: 3,
        max_price: max_budget,
        min_seats: seats || 1
      })

    if (tripsError) {
      console.warn('Error finding trips:', tripsError.message)
    }

    const trips = nearbyTrips || []
    let message = ''

    if (trips.length === 0) {
      message = "No trips found nearby. We'll notify drivers and get back to you!"
    } else {
      message = "Found these 🛒\n"
      trips.slice(0, 3).forEach((trip: any, idx: number) => {
        message += `${idx + 1}️⃣ ${trip.driver_name || 'Driver'} (${trip.pickup_area} → ${trip.dropoff_area} • ${trip.seats_available} seat${trip.seats_available > 1 ? 's' : ''} ${trip.price_estimate} RWF)\n`
      })
      message += "\nReply *book n* e.g. 'book 1'"
    }

    return new Response(
      JSON.stringify({
        success: true,
        request,
        nearby_trips: trips.slice(0, 3),
        message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-request:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})