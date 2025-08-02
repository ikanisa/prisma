import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { products, action = 'upsert' } = await req.json();
    
    if (!Deno.env.get('PINECONE_API_KEY')) {
      throw new Error('PINECONE_API_KEY not configured');
    }

    console.log(`Pinecone vector operation: ${action} for ${products?.length || 0} products`);

    // Initialize Pinecone client
    const pineconeUrl = `https://${Deno.env.get('PINECONE_INDEX_HOST')}/vectors/${action}`;
    
    // Process products for vector storage
    const vectors = products?.map((product: any) => ({
      id: product.id,
      values: await generateEmbedding(product.name + ' ' + product.description + ' ' + product.category),
      metadata: {
        name: product.name,
        category: product.category,
        price: product.price,
        vendor_id: product.vendor_id,
        unit: product.unit,
        created_at: product.created_at
      }
    })) || [];

    // Send to Pinecone
    const pineconeResponse = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': Deno.env.get('PINECONE_API_KEY') ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vectors,
        namespace: 'hardware_products'
      }),
    });

    if (!pineconeResponse.ok) {
      throw new Error(`Pinecone API error: ${pineconeResponse.status}`);
    }

    const result = await pineconeResponse.json();
    console.log(`Successfully ${action}ed ${vectors.length} vectors to Pinecone`);

    return new Response(
      JSON.stringify({ 
        success: true,
        action,
        vectors_processed: vectors.length,
        pinecone_result: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pinecone-hardware-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit text length
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}