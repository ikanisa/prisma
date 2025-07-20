import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    const executionStart = Date.now();

    let result;
    switch (action) {
      case 'createListing':
        result = await createVehicleListing(payload);
        break;
      case 'updateListing':
        result = await updateVehicleListing(payload);
        break;
      case 'deleteListing':
        result = await deleteVehicleListing(payload);
        break;
      case 'getListings':
        result = await getVehicleListings(payload);
        break;
      case 'toggleFeatured':
        result = await toggleFeaturedListing(payload);
        break;
      case 'updateViews':
        result = await updateViewCount(payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log execution
    const executionTime = Date.now() - executionStart;
    await supabase.from('agent_execution_log').insert({
      function_name: 'vehicle-listings-crud',
      input_data: { action, payload },
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Vehicle Listings CRUD Error:', error);
    
    await supabase.from('agent_execution_log').insert({
      function_name: 'vehicle-listings-crud',
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

async function createVehicleListing(payload: any) {
  const {
    vendor_id,
    make,
    model,
    year,
    price_rwf,
    mileage,
    fuel_type,
    transmission,
    condition,
    description,
    images = [],
    location,
    contact_phone
  } = payload;

  // Validate required fields
  if (!make || !model || !price_rwf) {
    throw new Error('Make, model, and price are required');
  }

  const { data, error } = await supabase
    .from('vehicle_listings')
    .insert({
      vendor_id,
      make,
      model,
      year,
      price_rwf,
      mileage,
      fuel_type,
      transmission,
      condition,
      description,
      images,
      location,
      contact_phone,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;

  // Update vendor's product count
  if (vendor_id) {
    await supabase.rpc('increment_vendor_products', { vendor_id });
  }

  return data;
}

async function updateVehicleListing(payload: any) {
  const { id, ...updates } = payload;

  if (!id) {
    throw new Error('Listing ID is required');
  }

  const { data, error } = await supabase
    .from('vehicle_listings')
    .update(updates)
    .eq('id', id)
    .eq('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteVehicleListing(payload: any) {
  const { id } = payload;

  if (!id) {
    throw new Error('Listing ID is required');
  }

  // Soft delete
  const { data, error } = await supabase
    .from('vehicle_listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Update vendor's product count
  if (data.vendor_id) {
    await supabase.rpc('decrement_vendor_products', { vendor_id: data.vendor_id });
  }

  return { success: true };
}

async function getVehicleListings(payload: any) {
  const {
    page = 1,
    limit = 20,
    make,
    fuel_type,
    transmission,
    condition,
    min_price,
    max_price,
    min_year,
    max_year,
    featured_only = false,
    search
  } = payload;

  let query = supabase
    .from('vehicle_listings')
    .select(`
      *,
      hardware_vendors (
        name,
        contact_phone,
        website
      )
    `)
    .eq('status', 'active')
    .is('deleted_at', null);

  // Apply filters
  if (make) query = query.eq('make', make);
  if (fuel_type) query = query.eq('fuel_type', fuel_type);
  if (transmission) query = query.eq('transmission', transmission);
  if (condition) query = query.eq('condition', condition);
  if (min_price) query = query.gte('price_rwf', min_price);
  if (max_price) query = query.lte('price_rwf', max_price);
  if (min_year) query = query.gte('year', min_year);
  if (max_year) query = query.lte('year', max_year);
  if (featured_only) query = query.eq('featured', true);

  // Search functionality
  if (search) {
    query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  // Get total count for pagination
  let countQuery = supabase
    .from('vehicle_listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('deleted_at', null);

  // Apply same filters for count
  if (make) countQuery = countQuery.eq('make', make);
  if (fuel_type) countQuery = countQuery.eq('fuel_type', fuel_type);
  if (transmission) countQuery = countQuery.eq('transmission', transmission);
  if (condition) countQuery = countQuery.eq('condition', condition);
  if (min_price) countQuery = countQuery.gte('price_rwf', min_price);
  if (max_price) countQuery = countQuery.lte('price_rwf', max_price);
  if (min_year) countQuery = countQuery.gte('year', min_year);
  if (max_year) countQuery = countQuery.lte('year', max_year);
  if (featured_only) countQuery = countQuery.eq('featured', true);
  if (search) {
    countQuery = countQuery.or(`make.ilike.%${search}%,model.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { count } = await countQuery;

  return {
    listings: data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  };
}

async function toggleFeaturedListing(payload: any) {
  const { id } = payload;

  if (!id) {
    throw new Error('Listing ID is required');
  }

  // Get current featured status
  const { data: current } = await supabase
    .from('vehicle_listings')
    .select('featured')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('vehicle_listings')
    .update({ featured: !current?.featured })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateViewCount(payload: any) {
  const { id } = payload;

  if (!id) {
    throw new Error('Listing ID is required');
  }

  const { error } = await supabase.rpc('increment_vehicle_views', { listing_id: id });
  if (error) throw error;

  return { success: true };
}