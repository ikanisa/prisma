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
    const { pickup_lng, pickup_lat, role } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (role === 'passenger') {
      // Return open trips within radius
      const { data: trips, error } = await supabase
        .from('trips')
        .select(`
          *,
          drivers(full_name)
        `)
        .eq('status', 'open')
        .gte('seats_available', 1)

      if (error) {
        throw new Error(`Failed to fetch trips: ${error.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          trips: trips || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (role === 'driver') {
      // Return open requests within radius
      const { data: requests, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          users(id)
        `)

      if (error) {
        throw new Error(`Failed to fetch requests: ${error.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          requests: requests || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid role specified')

  } catch (error) {
    console.error('Error in nearby-trips:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})