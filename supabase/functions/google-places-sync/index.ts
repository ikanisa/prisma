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
  const { location = 'Kigali, Rwanda', radius = 100000, type = 'pharmacy' } = payload; // Default to 100km
  
  console.log(`Starting comprehensive business sync for ${type} in ${location} with radius ${radius}m`);
  
  // Map Google Places types to our business_type enum with improved categorization
  const typeMapping: { [key: string]: string } = {
    'restaurant': 'restaurant',
    'pharmacy': 'pharmacy', 
    'drugstore': 'pharmacy',
    'store': 'store',
    'hotel': 'hotel',
    'gas_station': 'gas_station',
    'bank': 'bank',
    'school': 'school',
    'hospital': 'hospital',
    'bar': 'bar',
    'shop': 'store', // Generic shops go to store category
    'produce': 'store',
    'hardware': 'hardware',
    'salon': 'salon',
    'cosmetics': 'cosmetics'
  };

  // Function to intelligently categorize businesses based on name and types
  const categorizeBusiness = (name: string, types: string[], searchType: string): string => {
    const lowerName = name.toLowerCase();
    const typeStr = types.join(' ').toLowerCase();
    
    // Check for specific business types based on name and Google types
    if (lowerName.includes('pharmac') || lowerName.includes('drugstore') || typeStr.includes('pharmacy')) {
      return 'pharmacy';
    }
    if (lowerName.includes('hardware') || lowerName.includes('quincaillerie') || lowerName.includes('tool')) {
      return 'hardware';
    }
    if (lowerName.includes('salon') || lowerName.includes('hair') || lowerName.includes('barber') || lowerName.includes('coiffure')) {
      return 'salon';
    }
    if (lowerName.includes('cosmetic') || lowerName.includes('beauty') || lowerName.includes('makeup')) {
      return 'cosmetics';
    }
    if (lowerName.includes('restaurant') || lowerName.includes('food') || typeStr.includes('restaurant') || typeStr.includes('meal_takeaway')) {
      return 'restaurant';
    }
    if (lowerName.includes('bar') || lowerName.includes('pub') || lowerName.includes('club') || typeStr.includes('night_club') || typeStr.includes('bar')) {
      return 'bar';
    }
    if (lowerName.includes('hotel') || lowerName.includes('lodge') || typeStr.includes('lodging')) {
      return 'hotel';
    }
    if (lowerName.includes('gas') || lowerName.includes('petrol') || lowerName.includes('fuel') || typeStr.includes('gas_station')) {
      return 'gas_station';
    }
    if (lowerName.includes('bank') || typeStr.includes('bank') || typeStr.includes('atm')) {
      return 'bank';
    }
    if (lowerName.includes('school') || lowerName.includes('college') || lowerName.includes('university') || typeStr.includes('school')) {
      return 'school';
    }
    if (lowerName.includes('hospital') || lowerName.includes('clinic') || lowerName.includes('medical') || typeStr.includes('hospital')) {
      return 'hospital';
    }
    
    // Default based on search type or fallback to store
    return typeMapping[searchType] || 'store';
  };
  
  const businessCategory = typeMapping[type] || 'pharmacy';
  
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

    // Comprehensive search strategy for ALL business types
    const kigaliDistricts = [
      'Nyarugenge', 'Gasabo', 'Kicukiro'
    ];
    
    const kigaliSectors = [
      'Kimisagara', 'Mageragere', 'Nyamirambo', 'Rwezamenyo', 'Gitega',
      'Kimirango', 'Kigara', 'Cyahafi', 'Kimihurura', 'Remera', 'Kinyinya', 
      'Ndera', 'Nduba', 'Rusororo', 'Rutunga', 'Jali', 'Kacyiru', 'Kimironko',
      'Gisozi', 'Jabana', 'Gatenga', 'Kagarama', 'Kanombe', 'Kicukiro',
      'Masaka', 'Niboye', 'Nyarugunga', 'Bugesera'
    ];

    // Dynamic search terms based on business type - EXPANDED
    const typeSearchTerms: { [key: string]: string[] } = {
      'pharmacy': ['pharmacy', 'drugstore', 'pharmacie', 'medical store'],
      'restaurant': ['restaurant', 'eatery', 'dining', 'food'],
      'hotel': ['hotel', 'lodge', 'accommodation', 'guest house'],
      'store': ['store', 'shop', 'retail', 'market'],
      'gas_station': ['gas station', 'petrol station', 'fuel station', 'filling station'],
      'bank': ['bank', 'ATM', 'financial institution', 'banking'],
      'school': ['school', 'college', 'university', 'education'],
      'hospital': ['hospital', 'clinic', 'medical center', 'health center'],
      'bar': ['bar', 'pub', 'tavern', 'nightclub'],
      'shop': ['shop', 'store', 'boutique', 'retail'],
      'produce': ['market', 'grocery', 'produce', 'fresh food'],
      'hardware': ['hardware', 'tools', 'building supplies', 'construction', 'quincaillerie'],
      'salon': ['salon', 'hair salon', 'beauty salon', 'barber', 'coiffure'],
      'cosmetics': ['cosmetics', 'beauty products', 'makeup', 'perfume']
    };

    const searchTerms = typeSearchTerms[type] || [type];
    
    const searchQueries = [
      // Generic searches for the business type
      ...searchTerms.map(term => `${term} ${location}`),
      
      // District-based searches
      ...kigaliDistricts.flatMap(district => 
        searchTerms.map(term => `${term} ${district} Kigali Rwanda`)
      ),
      
      // Sector-based searches for comprehensive coverage
      ...kigaliSectors.flatMap(sector => 
        searchTerms.slice(0, 2).map(term => `${term} ${sector} Kigali Rwanda`)
      ),
      
      // Commercial area searches
      ...searchTerms.map(term => `${term} downtown Kigali Rwanda`),
      ...searchTerms.map(term => `${term} city center Kigali Rwanda`),
      ...searchTerms.map(term => `${term} CBD Kigali Rwanda`)
    ];

    // Process multiple search queries to get comprehensive results
    for (const searchQuery of searchQueries) {
      let queryNextPageToken = '';
      let queryPage = 1;
      
      do {
        const baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&radius=${radius}&key=${googlePlacesApiKey}`;
        const searchUrl = queryNextPageToken ? `${baseUrl}&pagetoken=${queryNextPageToken}` : baseUrl;
        
        console.log(`Calling Google Places API for "${searchQuery}" (page ${queryPage}):`, searchUrl.replace(googlePlacesApiKey, 'HIDDEN_KEY'));
        
        // Wait 3 seconds before making next page request (Google requirement - increased for stability)
        if (queryNextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        const response = await fetch(searchUrl);
        const data: GooglePlacesResponse = await response.json();

        console.log(`Google Places API response status for "${searchQuery}" (page ${queryPage}):`, data.status);
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          console.warn(`Google Places API warning for query "${searchQuery}": ${data.status}`);
          break; // Continue with next query instead of failing
        }

        if (data.results && data.results.length > 0) {
          console.log(`Found ${data.results.length} places for "${searchQuery}" on page ${queryPage}`);

          for (const place of data.results) {
            try {
              // Enhanced duplicate detection - check by place_id AND name
              if (places.some(p => p.place_id === place.place_id || 
                                   (p.name && place.name && p.name.toLowerCase().trim() === place.name.toLowerCase().trim()))) {
                continue;
              }

              // Get comprehensive place details including reviews and all available data
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,business_status,geometry,reviews,opening_hours,price_level,user_ratings_total,types,photos&key=${googlePlacesApiKey}`;
              
              const detailsResponse = await fetch(detailsUrl);
              const detailsData = await detailsResponse.json();
              
              if (detailsData.status === 'OK') {
                const placeDetails = detailsData.result;
                
                // Use intelligent categorization instead of simple mapping
                const smartCategory = categorizeBusiness(
                  placeDetails.name || place.name,
                  place.types,
                  type
                );
                
                // Prepare comprehensive business data
                const businessData = {
                  name: placeDetails.name || place.name,
                  category: smartCategory as any, // Cast to business_type enum
                  location_gps: placeDetails.geometry?.location ? 
                    `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})` : null,
                  momo_code: generateMomoCode(placeDetails.name || place.name),
                  status: placeDetails.business_status === 'OPERATIONAL' ? 'active' : 'inactive',
                  subscription_status: 'trial',
                  pos_system_config: {
                    google_places_id: place.place_id,
                    rating: placeDetails.rating || 0,
                    user_ratings_total: placeDetails.user_ratings_total || 0,
                    website: placeDetails.website,
                    phone: placeDetails.formatted_phone_number,
                    address: placeDetails.formatted_address,
                    opening_hours: placeDetails.opening_hours,
                    price_level: placeDetails.price_level,
                    reviews: placeDetails.reviews?.slice(0, 5) || [], // Store up to 5 most recent reviews
                    photos: placeDetails.photos?.slice(0, 3) || [], // Store up to 3 photos
                    types: place.types,
                    last_updated: new Date().toISOString()
                  }
                };
                
                console.log(`Inserting comprehensive business data: ${placeDetails.name} (Rating: ${placeDetails.rating || 'N/A'}, Reviews: ${placeDetails.user_ratings_total || 0})`);
                
                // Insert or update business with comprehensive data
                const { data: insertedBusiness, error: insertError } = await supabase.from('businesses').upsert(businessData, {
                  onConflict: 'name'
                }).select();
                
                if (insertError) {
                  console.error(`Failed to insert business ${placeDetails.name}:`, insertError);
                  failed++;
                } else {
                  // Auto-sync business phone numbers to contacts table
                  await syncBusinessToContacts(placeDetails, insertedBusiness[0]);
                  // Add to places array for return with all comprehensive data
                  places.push({
                    ...placeDetails,
                    types: place.types,
                    place_id: place.place_id,
                    reviews: placeDetails.reviews || [],
                    user_ratings_total: placeDetails.user_ratings_total || 0
                  });
                  successful++;
                }
              } else {
                console.error(`Failed to get details for place ${place.place_id}:`, detailsData.status);
                failed++;
              }
              
              processed++;
              
              // Minimal rate limiting - wait 100ms between requests to avoid hitting limits
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } catch (error) {
              console.error(`Failed to process place ${place.place_id}:`, error);
              failed++;
              processed++;
            }
          }
        }
        
        // Check for next page
        queryNextPageToken = data.next_page_token || '';
        queryPage++;
        
        // Process ALL available pages to get complete results
        
      } while (queryNextPageToken && queryPage <= 3); // Google Places API typically has 3 pages max per query
    }

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

// Function to sync business phone numbers to contacts table
async function syncBusinessToContacts(placeDetails: any, business: any) {
  try {
    const phoneNumbers = [];
    
    // Extract phone number from place details
    if (placeDetails.formatted_phone_number) {
      phoneNumbers.push({
        phone_number: placeDetails.formatted_phone_number,
        name: placeDetails.name,
        contact_type: 'business',
        status: 'active'
      });
    }
    
    // Extract whatsapp number if different from phone
    if (business.whatsapp_number && business.whatsapp_number !== placeDetails.formatted_phone_number) {
      phoneNumbers.push({
        phone_number: business.whatsapp_number,
        name: placeDetails.name + ' (WhatsApp)',
        contact_type: 'business',
        status: 'active'
      });
    }
    
    // Insert phone numbers into contacts table
    for (const contact of phoneNumbers) {
      const { error } = await supabase.from('contacts').upsert(contact, {
        onConflict: 'phone_number'
      });
      
      if (error) {
        console.error(`Failed to sync contact for ${contact.name}:`, error);
      } else {
        console.log(`Synced contact: ${contact.name} - ${contact.phone_number}`);
      }
    }
  } catch (error) {
    console.error('Error syncing business to contacts:', error);
  }
}