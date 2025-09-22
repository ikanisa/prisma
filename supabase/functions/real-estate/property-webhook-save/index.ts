import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received property webhook payload:', JSON.stringify(payload, null, 2));

    // payload.items = [ {title,address,lat,lng,price,whatsapp,photos} … ]
    const inserts = (payload.items || []).map((i: any) => ({
      source: payload.meta?.source || 'unknown',
      external_id: i.id || `${i.title}-${Date.now()}`,
      title: i.title,
      description: i.description || i.desc,
      price_usd: parseFloat(i.price) || null,
      bedrooms: parseInt(i.bedrooms) || null,
      bathrooms: parseInt(i.bathrooms) || null,
      address: i.address,
      lat: parseFloat(i.lat) || null,
      lng: parseFloat(i.lng) || null,
      whatsapp: i.whatsapp || i.contact?.whatsapp,
      photos: i.photos || []
    }));

    console.log(`Processing ${inserts.length} property listings`);

    if (inserts.length > 0) {
      const sb = getSupabaseClient();
      const { error: insertError } = await sb
        .from('property_listings')
        .upsert(inserts, { onConflict: 'external_id' });

      if (insertError) {
        console.error('Database insert error:', insertError);
        return new Response(
          JSON.stringify({ error: `Database error: ${insertError.message}` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: inserts.length,
        message: 'Property listings saved successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in property-webhook-save:', error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});