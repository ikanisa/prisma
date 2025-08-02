import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, lat, lng } = await req.json();
    
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    console.log('Testing spatial system with:', { text, lat, lng });

      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Test 1: Geocoding if text provided
    let geocodeResult = null;
    if (text) {
      console.log('Testing geocoding for:', text);
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          tools: [{
            type: "function",
            function: {
              name: "geo",
              description: "Extract Rwandan place‑names and return lat/lng",
              parameters: {
                type: "object",
                properties: {
                  lat: { type: "number" },
                  lng: { type: "number" },
                  name: { type: "string" },
                },
                required: ["lat", "lng"],
              },
            },
          }],
          messages: [{
            role: "user",
            content: `Give me lat/lng & city name for: "${text}". Return via geo() only. Rwanda locations only.`,
          }],
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const call = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (call) {
          geocodeResult = JSON.parse(call);
          console.log('Geocoded result:', geocodeResult);
        }
      }
    }

    // Test 2: Nearby drivers search if lat/lng provided
    let nearbyDrivers = null;
    const searchLat = lat || geocodeResult?.lat || -1.9441;
    const searchLng = lng || geocodeResult?.lng || 30.0619;
    
    console.log('Testing nearby drivers search at:', { searchLat, searchLng });
    
    const { data: drivers, error: driversError } = await supabase.rpc("fn_get_nearby_drivers_spatial", {
      lat: searchLat,
      lng: searchLng,
      radius: 5 // 5km radius for testing
    });

    if (driversError) {
      console.error('Nearby drivers error:', driversError);
    } else {
      nearbyDrivers = drivers;
      console.log('Found drivers:', drivers?.length || 0);
    }

    // Test 3: Create a test trip
    let testTrip = null;
    try {
      const { data: trip, error: tripError } = await supabase
        .from("driver_trips_spatial")
        .insert([{
          driver_phone: "+250788123456",
          from_text: "Test Origin",
          to_text: "Test Destination", 
          seats: 2,
          price_rwf: 3000,
          origin: `SRID=4326;POINT(${searchLng} ${searchLat})`,
          destination: `SRID=4326;POINT(${searchLng + 0.01} ${searchLat + 0.01})`,
        }])
        .select("id")
        .single();

      if (tripError) {
        console.error('Test trip creation error:', tripError);
      } else {
        testTrip = trip;
        console.log('Test trip created:', trip.id);
        
        // Clean up the test trip
        await supabase
          .from("driver_trips_spatial")
          .delete()
          .eq("id", trip.id);
        console.log('Test trip cleaned up');
      }
    } catch (error) {
      console.error('Test trip error:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      tests: {
        geocoding: {
          input: text,
          result: geocodeResult
        },
        nearbyDrivers: {
          searchCoords: { lat: searchLat, lng: searchLng },
          count: nearbyDrivers?.length || 0,
          drivers: nearbyDrivers?.slice(0, 3) || [] // First 3 for brevity
        },
        testTrip: {
          created: !!testTrip,
          id: testTrip?.id || null
        }
      },
      message: "Spatial transport system is working!"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Test spatial transport error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      tests: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});