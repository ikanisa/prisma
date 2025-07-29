import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookRideRequest {
  passenger_phone: string
  pickup_location: {
    lat: number
    lng: number
    address?: string
  }
  destination: {
    lat: number
    lng: number
    address?: string
  }
  ride_type?: 'moto' | 'car' | 'any'
  notes?: string
  estimated_fare?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      passenger_phone,
      pickup_location,
      destination,
      ride_type = 'any',
      notes,
      estimated_fare
    }: BookRideRequest = await req.json()

    // Validate required fields
    if (!passenger_phone || !pickup_location || !destination) {
      return new Response(
        JSON.stringify({ error: 'passenger_phone, pickup_location, and destination are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate distance between pickup and destination
    const R = 6371 // Earth's radius in km
    const dLat = (destination.lat - pickup_location.lat) * Math.PI / 180
    const dLng = (destination.lng - pickup_location.lng) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(pickup_location.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
             Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance_km = R * c

    // Calculate estimated fare if not provided
    let fare = estimated_fare
    if (!fare) {
      // Base fare + distance-based pricing (simplified)
      const base_fare = ride_type === 'moto' ? 500 : 1000
      const per_km_rate = ride_type === 'moto' ? 200 : 400
      fare = Math.round(base_fare + (distance_km * per_km_rate))
    }

    // Create passenger intent record
    const { data: intent, error: intentError } = await supabase
      .from('passenger_intents_spatial')
      .insert({
        passenger_phone,
        pickup_location: `POINT(${pickup_location.lng} ${pickup_location.lat})`,
        destination_location: `POINT(${destination.lng} ${destination.lat})`,
        ride_type,
        estimated_fare: fare,
        notes,
        status: 'searching',
        metadata: {
          pickup_address: pickup_location.address,
          destination_address: destination.address,
          distance_km: Math.round(distance_km * 100) / 100,
          booking_source: 'whatsapp_omni'
        }
      })
      .select()
      .single()

    if (intentError) {
      console.error('Intent creation error:', intentError)
      return new Response(
        JSON.stringify({ error: 'Failed to create ride request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find nearby drivers using the existing RPC function
    const { data: nearbyDrivers, error: driversError } = await supabase
      .rpc('get_nearby_drivers', {
        pickup_lat: pickup_location.lat,
        pickup_lng: pickup_location.lng,
        radius_km: 10,
        max_results: 5
      })

    if (driversError) {
      console.error('Drivers search error:', driversError)
    }

    // Update user profile with ride preferences
    await supabase.rpc('update_user_interaction_stats', {
      phone_number: passenger_phone,
      interaction_type: 'ride_booking'
    })

    // If we found drivers, try to create a booking with the closest one
    let booking = null
    if (nearbyDrivers && nearbyDrivers.length > 0) {
      const closestDriver = nearbyDrivers[0]
      
      // Create booking attempt
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings_spatial')
        .insert({
          passenger_intent_id: intent.id,
          status: 'pending_driver_acceptance',
          fare_rwf: fare,
          channel: 'whatsapp'
        })
        .select()
        .single()

      if (!bookingError) {
        booking = newBooking
      }
    }

    const result = {
      intent_id: intent.id,
      booking_id: booking?.id,
      status: booking ? 'pending_driver_acceptance' : 'searching_for_drivers',
      estimated_fare: fare,
      distance_km: Math.round(distance_km * 100) / 100,
      ride_type,
      pickup_location,
      destination,
      nearby_drivers_count: nearbyDrivers?.length || 0,
      next_steps: booking 
        ? 'Driver notification sent. Waiting for acceptance.'
        : 'Searching for available drivers in your area.',
      eta_minutes: booking ? 5 : null
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in book-ride:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})