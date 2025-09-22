import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { query, type, filters = {} } = await req.json();

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate input
    if (!query || !type || !['property', 'vehicle'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters. Query and type (property|vehicle) are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tableName = type === 'property' ? 'tbl_properties' : 'tbl_vehicles';
    
    // Build base query
    let dbQuery = supabase
      .from(tableName)
      .select('*')
      .eq('status', 'published');

    // Add search functionality
    if (query) {
      if (type === 'property') {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,district.ilike.%${query}%`);
      } else {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,make.ilike.%${query}%,model.ilike.%${query}%`);
      }
    }

    // Apply filters
    if (filters.action) {
      dbQuery = dbQuery.eq('action', filters.action);
    }

    if (type === 'property') {
      if (filters.district) {
        dbQuery = dbQuery.eq('district', filters.district);
      }
      if (filters.minPrice) {
        const priceColumn = filters.action === 'rent' ? 'price_month' : 'price_total';
        dbQuery = dbQuery.gte(priceColumn, filters.minPrice);
      }
      if (filters.maxPrice) {
        const priceColumn = filters.action === 'rent' ? 'price_month' : 'price_total';
        dbQuery = dbQuery.lte(priceColumn, filters.maxPrice);
      }
      if (filters.bedrooms) {
        dbQuery = dbQuery.gte('bedrooms', filters.bedrooms);
      }
      if (filters.furnished !== undefined) {
        dbQuery = dbQuery.eq('furnished', filters.furnished);
      }
    } else if (type === 'vehicle') {
      if (filters.make) {
        dbQuery = dbQuery.eq('make', filters.make);
      }
      if (filters.minYear) {
        dbQuery = dbQuery.gte('year', filters.minYear);
      }
      if (filters.maxYear) {
        dbQuery = dbQuery.lte('year', filters.maxYear);
      }
      if (filters.transmission) {
        dbQuery = dbQuery.eq('transmission', filters.transmission);
      }
      if (filters.fuelType) {
        dbQuery = dbQuery.eq('fuel_type', filters.fuelType);
      }
      if (filters.minPrice) {
        const priceColumn = filters.action === 'rent' ? 'daily_rate' : 'sale_price';
        dbQuery = dbQuery.gte(priceColumn, filters.minPrice);
      }
      if (filters.maxPrice) {
        const priceColumn = filters.action === 'rent' ? 'daily_rate' : 'sale_price';
        dbQuery = dbQuery.lte(priceColumn, filters.maxPrice);
      }
    }

    // Execute query with limit
    const { data, error } = await dbQuery
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Search error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format results for WhatsApp display
    const formattedResults = data?.map((item, index) => {
      const price = type === 'property' 
        ? (item.action === 'rent' ? `${item.price_month?.toLocaleString()} RWF/month` : `${item.price_total?.toLocaleString()} RWF`)
        : (item.action === 'rent' ? `${item.daily_rate?.toLocaleString()} RWF/day` : `${item.sale_price?.toLocaleString()} RWF`);

      const details = type === 'property'
        ? `${item.bedrooms || 0} bed, ${item.bathrooms || 0} bath in ${item.district || 'N/A'}`
        : `${item.year || 'N/A'} ${item.make || ''} ${item.model || ''}, ${item.transmission || 'N/A'}`;

      return {
        id: item.id,
        index: index + 1,
        title: item.title,
        price,
        details,
        action: item.action,
        images: item.imgs || [],
        ownerPhone: item.owner_phone
      };
    }) || [];

    console.log(`Search completed: ${formattedResults.length} ${type}s found`);

    return new Response(
      JSON.stringify({ 
        results: formattedResults,
        query,
        type,
        totalFound: formattedResults.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});