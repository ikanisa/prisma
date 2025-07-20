import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.1';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_KEY');

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
    if (!GOOGLE_KEY) {
      return err('Google Places API key not configured', 500);
    }

    const { category, pagetoken } = await req.json();

    const typesMap: Record<string, string> = {
      bar: 'bar',
      pharmacy: 'pharmacy',
      hardware: 'hardware_store',
      farmer: 'grocery_or_supermarket'
    };

    if (!typesMap[category]) {
      return err('unsupported category');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('key', GOOGLE_KEY);
    url.searchParams.set('keyword', category);
    url.searchParams.set('type', typesMap[category]);
    url.searchParams.set('location', '-1.944426,30.061012'); // Kigali centre
    url.searchParams.set('radius', '50000'); // 50 km
    if (pagetoken) url.searchParams.set('pagetoken', pagetoken);

    console.log('Fetching from Google Places API:', url.toString());

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data);
      return err(`Google Places API error: ${data.status}`, 500);
    }

    const inserts = (data.results ?? []).map((p: any) => ({
      place_id: p.place_id,
      name: p.name,
      category,
      phone: p.formatted_phone_number ?? null,
      website: p.website ?? null,
      address: p.vicinity,
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
      google_rating: p.rating ?? null
    }));

    console.log(`Processing ${inserts.length} places for category: ${category}`);

    if (inserts.length > 0) {
      const { error: insertError } = await sb
        .from('canonical_locations')
        .upsert(inserts, { onConflict: 'place_id' });

      if (insertError) {
        console.error('Database insert error:', insertError);
        return err(`Database error: ${insertError.message}`, 500);
      }
    }

    return ok({
      inserted: inserts.length,
      next_page_token: data.next_page_token ?? null,
      status: data.status
    });

  } catch (error) {
    console.error('Error in google-places-sync:', error);
    return err(`Server error: ${error.message}`, 500);
  }
});

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function err(message: string, status = 400) {
  return ok({ error: message }, status);
}