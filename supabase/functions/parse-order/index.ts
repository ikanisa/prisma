import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, bar_id } = await req.json();
    
    if (!message || !bar_id) {
      throw new Error('message and bar_id are required');
    }

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get available products for this bar
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock_qty')
      .eq('business_id', bar_id)
      .gt('stock_qty', 0);

    if (productsError) {
      throw productsError;
    }

    const orderItems = parseOrderMessage(message.toLowerCase(), products || []);
    
    console.log(`Parsed order: ${JSON.stringify(orderItems)}`);

    return new Response(JSON.stringify({ items: orderItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error parsing order:', error);
    return new Response(JSON.stringify({ error: error.message, items: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseOrderMessage(message: string, products: any[]): any[] {
  const items: any[] = [];
  
  // Common patterns for ordering
  const patterns = [
    // "add 2x beer" or "add 2 beer" or "2x gin tonic"
    /(?:add\s+)?(\d+)(?:x|\s+)(.+?)(?:\s|$)/g,
    // "beer x2" or "gin tonic x 2"
    /(.+?)\s*x\s*(\d+)/g,
    // Just item names without quantity (default to 1)
    /(?:add\s+)?([a-zA-Z\s]+)/g
  ];

  // First try quantity-specific patterns
  let match;
  let foundItems = false;

  // Pattern 1: "add 2x beer"
  const pattern1 = /(?:add\s+)?(\d+)(?:x|\s+)(.+?)(?:\s|$)/g;
  while ((match = pattern1.exec(message)) !== null) {
    const qty = parseInt(match[1]);
    const itemName = match[2].trim();
    const product = findProduct(itemName, products);
    
    if (product && qty > 0) {
      items.push({
        product_id: product.id,
        product_name: product.name,
        qty: Math.min(qty, product.stock_qty),
        unit_price: product.price
      });
      foundItems = true;
    }
  }

  // Pattern 2: "beer x2"
  if (!foundItems) {
    const pattern2 = /(.+?)\s*x\s*(\d+)/g;
    while ((match = pattern2.exec(message)) !== null) {
      const itemName = match[1].trim();
      const qty = parseInt(match[2]);
      const product = findProduct(itemName, products);
      
      if (product && qty > 0) {
        items.push({
          product_id: product.id,
          product_name: product.name,
          qty: Math.min(qty, product.stock_qty),
          unit_price: product.price
        });
        foundItems = true;
      }
    }
  }

  // Pattern 3: Just item names (default qty = 1)
  if (!foundItems) {
    const words = message.replace(/add\s+/g, '').split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      // Try single words and combinations
      for (let j = i + 1; j <= Math.min(words.length, i + 3); j++) {
        const itemName = words.slice(i, j).join(' ');
        const product = findProduct(itemName, products);
        
        if (product) {
          const existingItem = items.find(item => item.product_id === product.id);
          if (existingItem) {
            existingItem.qty += 1;
          } else {
            items.push({
              product_id: product.id,
              product_name: product.name,
              qty: 1,
              unit_price: product.price
            });
          }
          i = j - 1; // Skip processed words
          break;
        }
      }
    }
  }

  return items;
}

function findProduct(itemName: string, products: any[]): any | null {
  const name = itemName.toLowerCase().trim();
  
  // Direct match
  let product = products.find(p => p.name.toLowerCase() === name);
  if (product) return product;
  
  // Partial match
  product = products.find(p => p.name.toLowerCase().includes(name));
  if (product) return product;
  
  // Fuzzy match (remove common words)
  const cleanName = name.replace(/\b(and|&|with)\b/g, '').trim();
  product = products.find(p => {
    const cleanProductName = p.name.toLowerCase().replace(/\b(and|&|with)\b/g, '').trim();
    return cleanProductName.includes(cleanName) || cleanName.includes(cleanProductName);
  });
  
  return product || null;
}