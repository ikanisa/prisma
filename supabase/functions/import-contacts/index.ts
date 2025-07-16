import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Only POST method allowed', { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { lat, lng, radius = 3000, keyword = '' } = await req.json();
    
    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'Missing lat or lng' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_KEY');
    
    if (!GOOGLE_KEY) {
      return new Response(JSON.stringify({ error: 'Google Places API key not configured' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${keyword}&key=${GOOGLE_KEY}`;

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return new Response(JSON.stringify({ error: data.status }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const upserts = data.results.map((place: any) => ({
      phone: null, // Google doesn't expose phone in free API
      source: 'google_places',
      name: place.name,
      location: place.vicinity,
      category: place.types?.[0] || null,
      business_name: place.name
    }));

    const { error: insertError } = await supabase
      .from('user_contacts')
      .insert(upserts);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ inserted: upserts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in import-contacts:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});