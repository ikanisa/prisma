import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, withSupabase } from "../_shared/supabase.ts";

interface PropertyListing {
  id?: string;
  vendor_id?: string;
  title: string;
  type: 'rent' | 'sale';
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  location?: any; // PostGIS geometry
  images?: string[];
  source?: string;
  whatsapp?: string;
  description?: string;
  amenities?: string[];
  area_sqm?: number;
  status?: string;
}

interface PropertyFilters {
  type?: 'rent' | 'sale';
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  location?: { lat: number; lng: number; radius: number };
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'list':
        return await listProperties(payload as PropertyFilters);
      case 'create':
        return await createProperty(payload as PropertyListing);
      case 'update':
        return await updateProperty(payload as { id: string } & Partial<PropertyListing>);
      case 'delete':
        return await deleteProperty(payload as { id: string });
      case 'get_by_id':
        return await getPropertyById(payload as { id: string });
      case 'search_nearby':
        return await searchNearbyProperties(payload as { lat: number; lng: number; radius: number });
      case 'bulk_import':
        return await bulkImportProperties(payload as { properties: PropertyListing[] });
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Property Listing Manager error:', error);
    
    await withSupabase(async (client) => {
      await client.from('agent_execution_log').insert({
        function_name: 'property-listing-manager',
        input_data: { error: error.message },
        success_status: false,
        error_details: error.message,
        execution_time_ms: 0
      });
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function listProperties(filters: PropertyFilters) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { 
      page = 1, 
      limit = 20,
      type,
      min_price,
      max_price,
      bedrooms,
      bathrooms,
      status,
      search,
      location
    } = filters;
    
    const offset = (page - 1) * limit;

    let query = client
      .from('tbl_properties')
      .select(`
        *,
        vendors!vendor_id (
          id,
          name,
          whatsapp,
          category
        )
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (min_price) {
      query = query.gte('price', min_price);
    }

    if (max_price) {
      query = query.lte('price', max_price);
    }

    if (bedrooms) {
      query = query.eq('bedrooms', bedrooms);
    }

    if (bathrooms) {
      query = query.eq('bathrooms', bathrooms);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Location-based search using PostGIS
    if (location) {
      const { lat, lng, radius } = location;
      query = query.rpc('properties_within_radius', {
        center_lat: lat,
        center_lng: lng,
        radius_meters: radius
      });
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'property-listing-manager',
      input_data: filters,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          properties: data || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function createProperty(property: PropertyListing) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    // Create location geometry if coordinates provided
    let locationData = null;
    if (property.location && property.location.lat && property.location.lng) {
      locationData = `POINT(${property.location.lng} ${property.location.lat})`;
    }

    const propertyData = {
      ...property,
      location: locationData,
      status: property.status || 'active',
      source: property.source || 'manual'
    };

    const { data, error } = await client
      .from('tbl_properties')
      .insert(propertyData)
      .select(`
        *,
        vendors!vendor_id (
          id,
          name,
          whatsapp,
          category
        )
      `)
      .single();

    if (error) throw error;

    // If property has a description > 512 chars, trigger vector embedding
    if (property.description && property.description.length > 512) {
      await client.functions.invoke('pinecone-vector-manager', {
        body: {
          action: 'embed_text',
          payload: {
            text: property.description,
            namespace: 'tbl_properties',
            metadata: {
              property_id: data.id,
              title: property.title,
              type: property.type,
              price: property.price
            }
          }
        }
      });
    }

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'property-listing-manager',
      input_data: property,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function updateProperty(payload: { id: string } & Partial<PropertyListing>) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { id, ...updates } = payload;

    // Handle location update
    if (updates.location && updates.location.lat && updates.location.lng) {
      updates.location = `POINT(${updates.location.lng} ${updates.location.lat})`;
    }

    const { data, error } = await client
      .from('tbl_properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select(`
        *,
        vendors!vendor_id (
          id,
          name,
          whatsapp,
          category
        )
      `)
      .single();

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'property-listing-manager',
      input_data: payload,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function deleteProperty(payload: { id: string }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { data, error } = await client
      .from('tbl_properties')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', payload.id)
      .select()
      .single();

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'property-listing-manager',
      input_data: payload,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function getPropertyById(payload: { id: string }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { data, error } = await client
      .from('tbl_properties')
      .select(`
        *,
        vendors!vendor_id (
          id,
          name,
          whatsapp,
          category,
          location
        )
      `)
      .eq('id', payload.id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'property-listing-manager',
      input_data: payload,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function searchNearbyProperties(payload: { lat: number; lng: number; radius: number }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { lat, lng, radius } = payload;

    // Use PostGIS to find properties within radius
    const { data, error } = await client
      .rpc('properties_within_radius', {
        center_lat: lat,
        center_lng: lng,
        radius_meters: radius
      });

    if (error) throw error;

    const executionTime = Date.now() - startTime;

    // Log successful execution
    await client.from('agent_execution_log').insert({
      function_name: 'property-listing-manager',
      input_data: payload,
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data: data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function bulkImportProperties(payload: { properties: PropertyListing[] }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { properties } = payload;
    
    // Process in batches to avoid timeout
    const batchSize = 50;
    let totalInserted = 0;
    let totalErrors = 0;
    const errors: any[] = [];

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      
      try {
        // Process location data for each property
        const processedProperties = batch.map(property => ({
          ...property,
          location: property.location && property.location.lat && property.location.lng 
            ? `POINT(${property.location.lng} ${property.location.lat})`
            : null,
          status: property.status || 'active',
          source: property.source || 'import'
        }));

        const { data, error } = await client
          .from('tbl_properties')
          .insert(processedProperties)
          .select();

        if (error) throw error;
        
        totalInserted += data?.length || 0;
      } catch (error) {
        totalErrors++;
        errors.push({
          batch_start: i,
          batch_end: Math.min(i + batchSize - 1, properties.length - 1),
          error: error.message
        });
      }
    }

    const executionTime = Date.now() - startTime;

    // Log execution
    await client.from('agent_execution_log').insert({
      function_name: 'property-listing-manager',
      input_data: { total_properties: properties.length, inserted: totalInserted },
      success_status: totalErrors === 0,
      execution_time_ms: executionTime,
      error_details: errors.length > 0 ? JSON.stringify(errors) : null
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total_provided: properties.length,
          inserted: totalInserted,
          errors: totalErrors,
          error_details: errors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}