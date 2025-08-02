import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Testing Pinecone integration...');

    if (!pineconeApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'PINECONE_API_KEY not configured',
          configured: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test Pinecone API connection by listing indexes
    const response = await fetch('https://api.pinecone.io/indexes', {
      headers: {
        'Api-Key': pineconeApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ 
          error: 'Pinecone API call failed',
          details: error,
          configured: false
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const indexes = await response.json();
    const hasAgentIndex = indexes.indexes?.some((index: any) => 
      index.name?.includes('easymo') || index.name?.includes('agent')
    );

    console.log('✅ Pinecone integration test passed');

    return new Response(
      JSON.stringify({
        success: true,
        configured: true,
        api_accessible: true,
        indexes_available: indexes.indexes?.length || 0,
        has_agent_index: hasAgentIndex,
        message: 'Pinecone integration is working correctly'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Pinecone integration test failed:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Pinecone integration test failed',
        message: error.message,
        configured: !!pineconeApiKey
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});