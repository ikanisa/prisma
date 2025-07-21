import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GooglePlacesResponse {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    types: string[];
    rating?: number;
    formatted_phone_number?: string;
    website?: string;
    business_status?: string;
  }>;
  status: string;
  next_page_token?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    // Log execution start
    const executionStart = Date.now();
    
    if (!googlePlacesApiKey) {
      throw new Error('Google Places API key not configured');
    }

    let result;
    switch (action) {
      case 'syncBusinesses':
        result = await syncBusinesses(payload);
        break;
      case 'syncProperties':
        result = await syncProperties(payload);
        break;
      case 'getSyncStatus':
        result = await getSyncStatus();
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log execution
    const executionTime = Date.now() - executionStart;
    await supabase.from('agent_execution_log').insert({
      function_name: 'google-places-sync',
      input_data: { action, payload },
      success_status: true,
      execution_time_ms: executionTime,
      model_used: 'google-places-api'
    });

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Google Places Sync Error:', error);
    
    // Log error
    await supabase.from('agent_execution_log').insert({
      function_name: 'google-places-sync',
      success_status: false,
      error_details: error.message,
      execution_time_ms: Date.now() - Date.now()
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function syncBusinesses(payload: { location?: string; radius?: number; type?: string }) {
  const { location = 'Kigali, Rwanda', radius = 5000, type = 'restaurant' } = payload;
  
  console.log(`Starting business sync for ${type} in ${location} with radius ${radius}m`);
  
  // Map Google Places types to our business_type enum
  const typeMapping: { [key: string]: string } = {
    'restaurant': 'restaurant',
    'pharmacy': 'pharmacy', 
    'store': 'store',
    'hotel': 'hotel',
    'gas_station': 'gas_station',
    'bank': 'bank',
    'school': 'school',
    'hospital': 'hospital',
    'bar': 'bar',
    'shop': 'shop',
    'produce': 'produce',
    'hardware': 'hardware'
  };
  
  const businessCategory = typeMapping[type] || 'store';
  
  // Start sync run
  const { data: syncRun } = await supabase
    .from('data_sync_runs')
    .insert({
      sync_type: 'google_places_businesses',
      status: 'running',
      metadata: { location, radius, type, mapped_category: businessCategory }
    })
    .select()
    .single();

  try {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const places = [];
    let nextPageToken = '';
    let page = 1;

    // Fetch all pages of results
    do {
      const baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(type + ' in ' + location)}&radius=${radius}&key=${googlePlacesApiKey}`;
      const searchUrl = nextPageToken ? `${baseUrl}&pagetoken=${nextPageToken}` : baseUrl;
      
      console.log(`Calling Google Places API (page ${page}):`, searchUrl.replace(googlePlacesApiKey, 'HIDDEN_KEY'));
      
      // Wait 2 seconds before making next page request (Google requirement)
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const response = await fetch(searchUrl);
      const data: GooglePlacesResponse = await response.json();

      console.log(`Google Places API response status (page ${page}):`, data.status);
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      if (data.results && data.results.length > 0) {
        console.log(`Found ${data.results.length} places on page ${page} (total so far: ${places.length + data.results.length})`);

        for (const place of data.results) {
          try {
        // Get detailed place information
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,business_status,geometry&key=${googlePlacesApiKey}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status === 'OK') {
          const placeDetails = detailsData.result;
          
          // Prepare business data
          const businessData = {
            name: placeDetails.name,
            category: businessCategory,
            location_gps: `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})`,
            momo_code: generateMomoCode(placeDetails.name),
            status: placeDetails.business_status === 'OPERATIONAL' ? 'active' : 'inactive',
            pos_system_config: {
              google_places_id: place.place_id,
              rating: placeDetails.rating,
              website: placeDetails.website,
              phone: placeDetails.formatted_phone_number,
              address: placeDetails.formatted_address
            }
          };
          
          console.log(`Inserting business: ${placeDetails.name}`);
          
          // Insert or update business
          const { error: insertError } = await supabase.from('businesses').upsert(businessData, {
            onConflict: 'name'
          });
          
          if (insertError) {
            console.error(`Failed to insert business ${placeDetails.name}:`, insertError);
            failed++;
          } else {
            // Add to places array for return
            places.push({
              ...placeDetails,
              types: place.types,
              place_id: place.place_id
            });
            successful++;
          }
        } else {
          console.error(`Failed to get details for place ${place.place_id}:`, detailsData.status);
          failed++;
        }
        
          processed++;
          
          // Rate limiting - wait 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Failed to process place ${place.place_id}:`, error);
          failed++;
          processed++;
          }
        }
      }
      
      // Check for next page
      nextPageToken = data.next_page_token || '';
      page++;
      
      // Prevent infinite loops - max 20 pages (Google typically has max 3 pages with 20 results each = 60 results)
      if (page > 20) {
        console.log('Reached maximum page limit, stopping pagination');
        break;
      }
      
    } while (nextPageToken);

    console.log(`Completed fetching all pages. Total places found: ${places.length}`);

    // Update sync run
    await supabase
      .from('data_sync_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: processed,
        records_successful: successful,
        records_failed: failed,
        api_quota_used: processed * 2 + (page - 1) // details requests + search requests
      })
      .eq('id', syncRun.id);

    console.log(`Sync completed: ${successful} successful, ${failed} failed out of ${processed} processed`);

    return {
      syncRunId: syncRun.id,
      processed,
      successful,
      failed,
      quotaUsed: processed * 2 + (page - 1),
      totalPages: page - 1,
      places // Return the actual places data
    };

  } catch (error) {
    console.error('Business sync error:', error);
    
    // Update sync run with error
    await supabase
      .from('data_sync_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_details: error.message
      })
      .eq('id', syncRun.id);
    
    throw error;
  }
}

async function syncProperties(payload: { location?: string; type?: string; radius?: number }) {
  const { location = 'Kigali, Rwanda', type = 'real_estate_agency', radius = 5000 } = payload;
  
  console.log(`Starting property sync for ${type} in ${location}`);
  
  // Start sync run
  const { data: syncRun } = await supabase
    .from('data_sync_runs')
    .insert({
      sync_type: 'google_places_properties',
      status: 'running',
      metadata: { location, type, radius }
    })
    .select()
    .single();

  try {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(type + ' in ' + location)}&radius=${radius}&key=${googlePlacesApiKey}`;
    
    console.log('Calling Google Places API for properties:', searchUrl.replace(googlePlacesApiKey, 'HIDDEN_KEY'));
    const response = await fetch(searchUrl);
    const data: GooglePlacesResponse = await response.json();

    console.log('Google Places API response status:', data.status);
    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    console.log(`Found ${data.results.length} properties from Google Places`);

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const places = [];

    for (const place of data.results) {
      try {
        // Get detailed place information
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,business_status,geometry&key=${googlePlacesApiKey}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status === 'OK') {
          const placeDetails = detailsData.result;
          
          // Log property sync activity
          const { error: logError } = await supabase.from('property_sync_log').insert({
            source: 'google_places',
            property_id: place.place_id,
            action: 'sync',
            status: 'success',
            data_after: {
              name: placeDetails.name,
              address: placeDetails.formatted_address,
              location: placeDetails.geometry.location,
              rating: placeDetails.rating,
              types: place.types,
              phone: placeDetails.formatted_phone_number,
              website: placeDetails.website
            }
          });
          
          if (logError) {
            console.error(`Failed to log property ${placeDetails.name}:`, logError);
            failed++;
          } else {
            // Add to places array for return  
            places.push({
              ...placeDetails,
              types: place.types,
              place_id: place.place_id
            });
            successful++;
          }
        } else {
          console.error(`Failed to get details for property ${place.place_id}:`, detailsData.status);
          await supabase.from('property_sync_log').insert({
            source: 'google_places',
            property_id: place.place_id,
            action: 'sync',
            status: 'failed',
            error_message: `API error: ${detailsData.status}`
          });
          failed++;
        }
      } catch (error) {
        console.error(`Failed to process property ${place.place_id}:`, error);
        await supabase.from('property_sync_log').insert({
          source: 'google_places',
          property_id: place.place_id,
          action: 'sync',
          status: 'failed',
          error_message: error.message
        });
        failed++;
      }
      
      processed++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await supabase
      .from('data_sync_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: processed,
        records_successful: successful,
        records_failed: failed,
        api_quota_used: processed * 2
      })
      .eq('id', syncRun.id);

    console.log(`Property sync completed: ${successful} successful, ${failed} failed out of ${processed} processed`);

    return {
      syncRunId: syncRun.id,
      processed,
      successful,
      failed,
      quotaUsed: processed * 2,
      places // Return the actual places data
    };

  } catch (error) {
    console.error('Property sync error:', error);
    
    await supabase
      .from('data_sync_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_details: error.message
      })
      .eq('id', syncRun.id);
    
    throw error;
  }
}

async function getSyncStatus() {
  const { data: recentRuns } = await supabase
    .from('data_sync_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  const { data: quotaUsage } = await supabase
    .from('data_sync_runs')
    .select('api_quota_used')
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const totalQuotaUsed = quotaUsage?.reduce((sum, run) => sum + (run.api_quota_used || 0), 0) || 0;

  return {
    recentRuns,
    dailyQuotaUsed: totalQuotaUsed,
    dailyQuotaLimit: 1000 // Google Places API daily limit
  };
}

function generateMomoCode(businessName: string): string {
  // Generate a simple MoMo code based on business name
  const prefix = businessName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}${suffix}`;
}