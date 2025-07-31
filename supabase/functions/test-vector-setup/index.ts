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
    const results: any = {};
    
    // Test OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (openAIApiKey) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${openAIApiKey}` }
        });
        results.openai = {
          success: openaiResponse.ok,
          status: openaiResponse.status
        };
      } catch (e) {
        results.openai = { success: false, error: e.message };
      }
    } else {
      results.openai = { success: false, error: 'No API key found' };
    }

    // Test Pinecone API
    const pineconeKey = Deno.env.get('PINECONE_API_KEY');
    if (pineconeKey) {
      try {
        const pineconeResponse = await fetch('https://api.pinecone.io/indexes', {
          headers: { 
            'Api-Key': pineconeKey,
            'Content-Type': 'application/json'
          }
        });
        results.pinecone = {
          success: pineconeResponse.ok,
          status: pineconeResponse.status
        };
      } catch (e) {
        results.pinecone = { success: false, error: e.message };
      }
    } else {
      results.pinecone = { success: false, error: 'No API key found' };
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});