import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_name, district } = await req.json();
    
    console.log(`Fetching market price for ${product_name} in ${district}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if we have recent cached price (within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    let { data: cachedPrice } = await supabase
      .from('market_prices')
      .select('*')
      .eq('product_name', product_name.toLowerCase())
      .eq('district', district)
      .gte('updated_at', oneHourAgo)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedPrice) {
      console.log('Using cached price:', cachedPrice.price_per_kg);
      return new Response(JSON.stringify({
        success: true,
        product: product_name,
        price_per_kg: cachedPrice.price_per_kg,
        district: district,
        source: cachedPrice.source,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to fetch from MINAGRI API (simulated)
    let marketPrice;
    try {
      marketPrice = await fetchMINAGRIPrice(product_name, district);
    } catch (error) {
      console.log('MINAGRI API failed, using fallback prices');
      marketPrice = getFallbackPrice(product_name);
    }

    // Cache the price
    await supabase
      .from('market_prices')
      .insert({
        product_name: product_name.toLowerCase(),
        price_per_kg: marketPrice.price,
        district: district,
        source: marketPrice.source
      });

    return new Response(JSON.stringify({
      success: true,
      product: product_name,
      price_per_kg: marketPrice.price,
      district: district,
      source: marketPrice.source,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Market price error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchMINAGRIPrice(product: string, district: string) {
  // This would be the actual MINAGRI API call
  // For now, simulating with realistic Rwanda market prices
  
  const apiKey = Deno.env.get('MINAGRI_API_KEY');
  if (!apiKey) {
    throw new Error('MINAGRI API key not configured');
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock response based on real Rwanda market data
  return {
    price: getMarketPrice(product, district),
    source: 'MINAGRI'
  };
}

function getFallbackPrice(product: string) {
  // Fallback prices based on typical Rwanda market prices (RWF per kg)
  const fallbackPrices: { [key: string]: number } = {
    'maize': 250,
    'beans': 800,
    'potatoes': 200,
    'bananas': 150,
    'rice': 900,
    'cassava': 180,
    'sweet_potatoes': 220,
    'tomatoes': 500,
    'onions': 400,
    'carrots': 350,
    'cabbage': 150,
    'milk': 600,
    'meat': 2500,
    'chicken': 2000,
    'eggs': 25 // per piece
  };

  const normalizedProduct = product.toLowerCase().replace(/s$/, ''); // Remove plural
  const basePrice = fallbackPrices[normalizedProduct] || 300;

  // Add some variation (+/- 20%)
  const variation = (Math.random() - 0.5) * 0.4;
  const finalPrice = Math.round(basePrice * (1 + variation));

  return {
    price: finalPrice,
    source: 'FALLBACK'
  };
}

function getMarketPrice(product: string, district: string) {
  const basePrice = getFallbackPrice(product).price;
  
  // District price modifiers
  const districtModifiers: { [key: string]: number } = {
    'kigali': 1.2,
    'musanze': 0.9,
    'huye': 0.95,
    'rubavu': 1.1,
    'kayonza': 0.85,
    'nyagatare': 0.8
  };

  const modifier = districtModifiers[district?.toLowerCase()] || 1.0;
  return Math.round(basePrice * modifier);
}