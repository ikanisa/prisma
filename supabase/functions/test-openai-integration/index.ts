import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Testing OpenAI integration...');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY not configured',
          configured: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test OpenAI API connection
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API call failed',
          details: error,
          configured: false
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const models = await response.json();
    const hasGPT4 = models.data?.some((model: any) => model.id.includes('gpt-4'));

    console.log('✅ OpenAI integration test passed');

    return new Response(
      JSON.stringify({
        success: true,
        configured: true,
        api_accessible: true,
        models_available: models.data?.length || 0,
        has_gpt4: hasGPT4,
        message: 'OpenAI integration is working correctly'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ OpenAI integration test failed:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'OpenAI integration test failed',
        message: error.message,
        configured: !!openaiApiKey
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});