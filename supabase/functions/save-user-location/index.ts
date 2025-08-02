import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waId, latitude, longitude, phoneNumber } = await req.json();
    
    console.log('📍 Saving user location', { waId, phoneNumber, lat: latitude, lng: longitude });
    
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Save location to user_locations table
    const { data, error } = await supabase
      .from('user_locations')
      .insert({
        user_id: waId || phoneNumber,
        lat: latitude,
        lng: longitude
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save location: ${error.message}`);
    }

    console.log('✅ Location saved successfully', { locationId: data.id });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        location_id: data.id,
        message: 'Location saved successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error in save-user-location:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});