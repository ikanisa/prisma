import { supabaseClient } from "./client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateProfileRequest {
  phone_number: string
  updates: {
    preferred_service?: string
    fav_businesses?: string[]
    last_payment_amount?: number
    last_ride_destination?: string
    preferred_language?: string
    location?: { lat: number; lng: number }
    interaction_type?: string
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phone_number, updates }: UpdateProfileRequest = await req.json()

    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'phone_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!updates || Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'updates object is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Map updates to database columns
    if (updates.preferred_service) {
      updateData.preferred_service = updates.preferred_service
    }

    if (updates.fav_businesses) {
      updateData.fav_businesses = updates.fav_businesses
    }

    if (updates.last_payment_amount) {
      updateData.last_payment_amount = updates.last_payment_amount
    }

    if (updates.last_ride_destination) {
      updateData.last_ride_destination = updates.last_ride_destination
    }

    if (updates.preferred_language) {
      updateData.preferred_language = updates.preferred_language
    }

    if (updates.location) {
      updateData.last_known_location = `POINT(${updates.location.lng} ${updates.location.lat})`
    }

    // Upsert user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        phone_number,
        ...updateData
      }, {
        onConflict: 'phone_number'
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile update error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to update user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update interaction stats if interaction_type is provided
    if (updates.interaction_type) {
      await supabase.rpc('update_user_interaction_stats', {
        phone_number,
        interaction_type: updates.interaction_type
      })
    }

    // Log the profile update for analytics
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'update_user_profile',
        user_id: phone_number,
        input_data: { updates },
        success_status: true,
        execution_time_ms: 0,
        model_used: 'profile_update'
      })

    const result = {
      success: true,
      phone_number,
      updated_fields: Object.keys(updates),
      profile: {
        phone_number: profile.phone_number,
        preferred_service: profile.preferred_service,
        fav_businesses: profile.fav_businesses,
        interaction_count: profile.interaction_count,
        last_payment_amount: profile.last_payment_amount,
        last_ride_destination: profile.last_ride_destination,
        preferred_language: profile.preferred_language,
        updated_at: profile.updated_at
      },
      message: 'Profile updated successfully'
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in update-user-profile:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})