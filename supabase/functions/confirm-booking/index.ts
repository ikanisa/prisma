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
    const { booking_id, confirmed } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const newState = confirmed ? 'confirmed' : 'rejected'
    const confirmedAt = confirmed ? new Date().toISOString() : null

    // Update booking state
    const { data: booking, error } = await supabase
      .from('ride_bookings')
      .update({
        state: newState,
        confirmed_at: confirmedAt
      })
      .eq('id', booking_id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to update booking: ${error.message}`)
    }

    // If confirmed, update trip status
    if (confirmed && booking.trip_id) {
      await supabase
        .from('trips')
        .update({ status: 'booked' })
        .eq('id', booking.trip_id)
    }

    const message = confirmed 
      ? "🎉 Booking confirmed! Swap numbers if needed and hit delivered when done."
      : "❌ Booking declined. We'll find you another driver."

    console.log(`Booking ${booking_id} ${newState}`)

    return new Response(
      JSON.stringify({
        success: true,
        booking,
        message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in confirm-booking:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})