import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting hardware price refresh...');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all hardware businesses
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('category', 'hardware')
      .eq('status', 'active');

    if (businessError) {
      throw new Error(`Failed to fetch businesses: ${businessError.message}`);
    }

    if (!businesses || businesses.length === 0) {
      console.log('No hardware businesses found');
      return new Response(
        JSON.stringify({ message: 'No hardware businesses found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch market prices from external API (mock implementation)
    const priceUpdates = await fetchMarketPrices();
    
    // Update product prices based on market data
    let updatedCount = 0;
    
    for (const business of businesses) {
      // Get products for this business
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, category')
        .eq('vendor_id', business.id)
        .eq('status', 'active');

      if (productsError) {
        console.error(`Error fetching products for ${business.name}:`, productsError);
        continue;
      }

      for (const product of products || []) {
        // Find matching market price
        const marketPrice = priceUpdates.find(p => 
          p.category === product.category || 
          p.name.toLowerCase().includes(product.name.toLowerCase().split(' ')[0])
        );

        if (marketPrice) {
          // Calculate suggested price (market price + 15% margin)
          const suggestedPrice = Math.round(marketPrice.price * 1.15);
          
          // Only update if price difference is significant (>10%)
          const priceDiff = Math.abs(product.price - suggestedPrice) / product.price;
          
          if (priceDiff > 0.1) {
            // Log price change
            await supabase.from('product_versions').insert({
              product_id: product.id,
              old_price: product.price,
              new_price: suggestedPrice,
              changed_by: null // System update
            });

            // Update product price
            await supabase
              .from('products')
              .update({ 
                price: suggestedPrice,
                updated_at: new Date().toISOString()
              })
              .eq('id', product.id);

            updatedCount++;
            console.log(`Updated ${product.name}: ${product.price} -> ${suggestedPrice} RWF`);
          }
        }
      }
    }

    console.log(`Price refresh completed. Updated ${updatedCount} products.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        businesses_processed: businesses.length,
        products_updated: updatedCount,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in hardware-price-refresh:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Mock market price fetcher (replace with real API)
async function fetchMarketPrices() {
  // Simulate API call to Rwanda construction/hardware price index
  return [
    { name: 'cement', category: 'building', price: 18000 },
    { name: 'iron_sheets', category: 'building', price: 25000 },
    { name: 'pvc_pipe', category: 'plumbing', price: 3500 },
    { name: 'electrical_wire', category: 'electrical', price: 1200 },
    { name: 'paint', category: 'paint', price: 12000 },
    { name: 'nails', category: 'fasteners', price: 1800 },
    { name: 'screws', category: 'fasteners', price: 2200 },
    { name: 'hammer', category: 'tools', price: 8500 },
    { name: 'drill_bit', category: 'tools', price: 3200 },
    { name: 'safety_helmet', category: 'safety', price: 5500 }
  ];
}