import { supabaseClient } from "./client.ts";
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN');
const ACTOR_ID = Deno.env.get('APIFY_PROPERTY_ACTOR');

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
    if (!APIFY_TOKEN || !ACTOR_ID) {
      return new Response(
        JSON.stringify({ error: 'Apify credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { source = 'airbnb', location = 'Kigali, Rwanda' } = await req.json();

    console.log(`Starting property scrape for ${source} in ${location}`);

    const run = await fetch(`https://api.apify.com/v2/actors/${ACTOR_ID}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source,
        location,
        webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/property-webhook-save`
      })
    });

    const runData = await run.json();

    if (!run.ok) {
      console.error('Apify run failed:', runData);
      return new Response(
        JSON.stringify({ error: 'Failed to start scraping job' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        started: runData.data.id,
        status: 'running',
        message: 'Property scraping job started successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in property-scrape-trigger:', error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});