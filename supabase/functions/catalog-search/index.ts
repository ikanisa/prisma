import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { search_term, limit = 10 } = await req.json();
    
    if (!search_term) {
      return new Response(
        JSON.stringify({ error: 'Search term is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching pharmacy products for:', search_term);

    // Full-text search over products where category = 'pharmacy'
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'pharmacy')
      .or(`name.ilike.%${search_term}%,description.ilike.%${search_term}%`)
      .gt('stock_qty', 0)
      .limit(limit);

    if (error) {
      console.error('Database search error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to search products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format results for WhatsApp display
    const formattedResults = products.map((product, index) => ({
      id: product.id,
      index: index + 1,
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      stock_qty: product.stock_qty,
      formatted_display: `${index + 1}. ${product.name} (${product.unit}) – ${product.price} RWF`
    }));

    return new Response(
      JSON.stringify({
        success: true,
        results: formattedResults,
        total_found: products.length,
        search_term
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in catalog-search function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});