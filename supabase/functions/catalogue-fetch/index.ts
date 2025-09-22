import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, category, tag, limit = 30 } = await req.json();
    
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build query based on business category and tag filtering
    let query = supabaseClient
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        unit,
        category,
        stock_quantity,
        businesses!inner(id, name, category)
      `)
      .eq('businesses.id', business_id)
      .limit(limit);

    // Add category filter if specified
    if (category) {
      query = query.eq('category', category);
    }

    // Add tag filter if specified (assuming tags are stored as array)
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: products, error } = await query;

    if (error) {
      throw error;
    }

    // Group products by category for WhatsApp Interactive List
    const groupedProducts = products?.reduce((acc: any, product: any) => {
      const cat = product.category || 'Other';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push({
        id: product.id,
        title: `${product.name} (${product.unit})`,
        description: `${product.price} RWF${product.stock_quantity < 10 ? ' ⚠️ Low' : ''}`,
        metadata: {
          price: product.price,
          stock: product.stock_quantity,
          unit: product.unit
        }
      });
      return acc;
    }, {});

    // Format for WhatsApp Interactive List Message
    const sections = Object.entries(groupedProducts || {}).map(([categoryName, items]) => ({
      title: categoryName,
      rows: items
    }));

    const business = products?.[0]?.businesses;
    const verticalEmoji = {
      'pharmacy': '💊',
      'bar': '🍺', 
      'hardware': '🪚',
      'produce': '🍎'
    }[business?.category] || '🏪';

    const response = {
      type: "list",
      header: `${verticalEmoji} ${business?.name} — ${category || 'All Products'} (${products?.length || 0} items)`,
      body: "Tap an item for details & live price.",
      footer: "Prices incl. VAT",
      sections
    };

    // Log the fetch for analytics
    await supabaseClient
      .from('agent_execution_log')
      .insert({
        function_name: 'catalogue-fetch',
        input_data: { business_id, category, tag, limit },
        success_status: true,
        execution_time_ms: Date.now() % 1000,
        model_used: 'catalogue-api'
      });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in catalogue-fetch:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});