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
    const { passenger_id, trip_id, request_id } = await req.json()

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let driver_id, agreed_price

    if (trip_id) {
      // Booking based on trip selection
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('driver_id, price_estimate')
        .eq('id', trip_id)
        .single()

      if (tripError || !trip) {
        throw new Error('Trip not found')
      }

      driver_id = trip.driver_id
      agreed_price = trip.price_estimate
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('ride_bookings')
      .insert({
        trip_id,
        request_id,
        passenger_id,
        driver_id,
        agreed_price,
        state: 'pending'
      })
      .select('*')
      .single()

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`)
    }

    // Get driver info for WhatsApp
    const { data: driver } = await supabase
      .from('drivers')
      .select('full_name, momo_number')
      .eq('id', driver_id)
      .single()

    // Send WhatsApp template to driver
    const whatsappMessage = `👤 ${passenger_id} wants a ride (1 seat) at ${agreed_price} RWF. Reply YES to confirm or NO.`
    
    // Log to agent conversations
    await supabase
      .from('agent_conversations')
      .insert({
        user_id: driver_id,
        role: 'system',
        message: `Booking request: ${booking.id}`
      })

    console.log(`Booking created: ${booking.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        booking,
        message: `🎯 Booking request sent to ${driver?.full_name || 'driver'}. You'll get notified when they respond.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-booking:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})