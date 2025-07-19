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
    const { image_data, vendor_id } = await req.json();
    
    if (!image_data || !vendor_id) {
      throw new Error('Missing image_data or vendor_id');
    }

    console.log('Processing hardware price sheet for vendor:', vendor_id);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use OpenAI Vision API to parse price sheet
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a hardware store inventory parser. Extract products from the price sheet image.
            Return JSON array with fields: name, price, unit, category (plumbing/electrical/tools/paint/other), stock_quantity.
            Guess reasonable categories based on product names. Include emoji hints.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Parse this hardware store price sheet and extract all products:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image_data}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices[0].message.content;
    
    // Parse JSON from response
    let products;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      throw new Error('Failed to parse product data from image');
    }

    // Generate unique batch ID
    const batchId = crypto.randomUUID();

    // Insert products into products_draft table
    const draftProducts = products.map((product: any) => ({
      vendor_id,
      name: product.name,
      price: product.price,
      stock_quantity: product.stock_quantity || 0,
      unit: product.unit || 'pcs',
      category: product.category || 'other',
      import_batch_id: batchId,
      status: 'pending'
    }));

    const { data, error } = await supabase
      .from('products_draft')
      .insert(draftProducts)
      .select();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save parsed products');
    }

    console.log(`Successfully parsed ${products.length} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        products_count: products.length,
        batch_id: batchId,
        products: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in hardware-price-sheet-ocr:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});