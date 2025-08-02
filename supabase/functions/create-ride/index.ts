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
    const { driver_id, pickup_lng, pickup_lat, price_estimate, seats } = await req.json()

    if (!driver_id || !pickup_lng || !pickup_lat) {
      throw new Error('Missing required fields: driver_id, pickup_lng, pickup_lat')
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create the trip with proper error handling
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        driver_id,
        pickup_location: `POINT(${pickup_lng} ${pickup_lat})`,
        price_estimate: price_estimate || 2000,
        seats_available: seats || 1,
        status: 'open'
      })
      .select('*')
      .single()

    if (tripError) {
      console.error('Trip creation error:', tripError)
      throw new Error(`Failed to create trip: ${tripError.message}`)
    }

    // Update driver status to online
    const { error: driverError } = await supabase
      .from('drivers')
      .update({ 
        is_online: true,
        last_location: `POINT(${pickup_lng} ${pickup_lat})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', driver_id)

    if (driverError) {
      console.warn('Driver status update warning:', driverError)
    }

    // Create driver session
    await supabase
      .from('driver_sessions')
      .insert({
        driver_id,
        status: 'online',
        last_location: `POINT(${pickup_lng} ${pickup_lat})`
      })

    console.log(`✅ Trip created successfully: ${trip.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        trip,
        message: `🛵 You're now online! Trip ${trip.id} created at your location.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-ride:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: "❌ Failed to go online. Please try again."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
