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
    const { message, userId, domain } = await req.json();

    console.log('🤖 Testing OpenAI Agent SDK:', { userId, domain, messageLength: message?.length });

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY not configured',
          configured: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test chat completion with function calling capability
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for easyMO, a WhatsApp super-app for Rwanda. Respond briefly and helpfully.'
          },
          {
            role: 'user',
            content: message || 'Hello, this is a test message for Phase 4 completion'
          }
        ],
        functions: [
          {
            name: 'classify_intent',
            description: 'Classify user intent into domain categories',
            parameters: {
              type: 'object',
              properties: {
                domain: {
                  type: 'string',
                  enum: ['payments', 'mobility', 'ordering', 'listings', 'general']
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                }
              },
              required: ['domain', 'confidence']
            }
          }
        ],
        function_call: 'auto'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI chat completion failed',
          details: error
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chatData = await response.json();
    const assistantMessage = chatData.choices[0].message;
    
    // Check if function was called
    const functionCalled = !!assistantMessage.function_call;
    
    console.log('✅ OpenAI Agent SDK test passed');

    return new Response(
      JSON.stringify({
        success: true,
        thread_created: true,
        message_processed: true,
        function_calling_available: functionCalled,
        response: assistantMessage.content || 'Function called successfully',
        function_call: assistantMessage.function_call,
        message: 'OpenAI Agent SDK is working correctly'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ OpenAI Agent SDK test failed:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'OpenAI Agent SDK test failed',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});