import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache duration in milliseconds (2 minutes as specified)
const CACHE_DURATION = 2 * 60 * 1000;
const menuCache = new Map<string, { data: any; timestamp: number }>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bar_id } = await req.json();
    
    if (!bar_id) {
      throw new Error('bar_id is required');
    }

    // Check cache first
    const cacheKey = `menu_${bar_id}`;
    const cached = menuCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached menu for bar ${bar_id}`);
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get products for this bar where stock > 0
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        description,
        image_url,
        stock_qty,
        category,
        unit
      `)
      .eq('business_id', bar_id)
      .gt('stock_qty', 0)
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    // Get current happy hour status
    const { data: business } = await supabase
      .from('businesses')
      .select('name, extras')
      .eq('id', bar_id)
      .single();

    const happyHour = business?.extras?.happy_hour || { active: false, discount: 0 };
    
    // Group products by category and add happy hour pricing
    const menuData = {
      bar_name: business?.name || 'Bar',
      happy_hour: happyHour,
      categories: {} as Record<string, any[]>,
      updated_at: new Date().toISOString()
    };

    products?.forEach(product => {
      const category = product.category || 'Drinks';
      if (!menuData.categories[category]) {
        menuData.categories[category] = [];
      }

      const price = happyHour.active ? 
        Math.round(product.price * (1 - happyHour.discount / 100)) : 
        product.price;

      menuData.categories[category].push({
        ...product,
        display_price: price,
        original_price: product.price,
        discount_applied: happyHour.active && happyHour.discount > 0
      });
    });

    // Cache the result
    menuCache.set(cacheKey, {
      data: menuData,
      timestamp: now
    });

    console.log(`Generated fresh menu for bar ${bar_id} with ${products?.length || 0} products`);

    return new Response(JSON.stringify(menuData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating menu:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});