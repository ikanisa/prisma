import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { passenger_id, pickup_lng, pickup_lat, max_budget, seats } = await req.json()

    if (!passenger_id || !pickup_lng || !pickup_lat) {
      throw new Error('Missing required fields: passenger_id, pickup_lng, pickup_lat')
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create ride request
    const { data: request, error: requestError } = await supabase
      .from('ride_requests')
      .insert({
        passenger_id,
        pickup_location: `POINT(${pickup_lng} ${pickup_lat})`,
        max_budget: max_budget || 5000,
        seats_needed: seats || 1,
        status: 'open'
      })
      .select('*')
      .single()

    if (requestError) {
      console.error('Request creation error:', requestError)
      throw new Error(`Failed to create ride request: ${requestError.message}`)
    }

    // Find nearby trips within 5km
    const { data: nearbyTrips, error: tripsError } = await supabase
      .rpc('find_nearby_trips', {
        request_lat: pickup_lat,
        request_lng: pickup_lng,
        radius_km: 5
      })

    if (tripsError) {
      console.warn('Nearby trips query warning:', tripsError)
    }

    const trips = nearbyTrips || []
    
    let responseMessage = `🚗 Ride request created! Looking for drivers near you...`
    
    if (trips.length > 0) {
      responseMessage += `\n\nAvailable trips:`
      trips.slice(0, 3).forEach((trip, index) => {
        responseMessage += `\n${index + 1}. Driver ${trip.driver_name || trip.driver_id} - ${trip.price_estimate} RWF (${trip.distance_km?.toFixed(1)}km away)`
      })
      responseMessage += `\n\nReply with the number to book (e.g., "1")`
    } else {
      responseMessage += `\n\nNo drivers available nearby. We'll notify you when one appears! 🔔`
    }

    console.log(`✅ Ride request created: ${request.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        request,
        nearby_trips: trips,
        message: responseMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-request:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: "❌ Failed to create ride request. Please try again."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
