import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waId, conversationHistory, intent, outcome } = await req.json();

    console.log(`After-turn middleware processing for user: ${waId}`);

    // Generate conversation summary from recent history
    let summaryText = '';
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-5); // Last 5 messages
      summaryText = recentMessages.map((msg: any) => 
        `${msg.role}: ${msg.content}`
      ).join('\n');
    }

    // Extract learning insights from the interaction
    const learningInsights = {
      preferences: {
        lastIntent: intent,
        lastOutcome: outcome,
        timestamp: new Date().toISOString()
      },
      patterns: {
        interactionCount: conversationHistory?.length || 0,
        successfulIntents: outcome === 'success' ? 1 : 0
      },
      improvements: outcome === 'error' ? 'Consider improving error handling for this intent' : null,
      confidence: outcome === 'success' ? 0.8 : 0.4
    };

    // Call memory consolidator
    const memoryResponse = await supabase.functions.invoke('memory-consolidator', {
      body: {
        user_id: waId,
        conversation_summary: summaryText,
        learning_insights: learningInsights
      }
    });

    if (memoryResponse.error) {
      console.error('Memory consolidation failed:', memoryResponse.error);
    } else {
      console.log('Memory consolidation successful for user:', waId);
    }

    // Also log the interaction pattern for analytics
    await supabase
      .from('agent_execution_log')
      .insert({
        user_id: waId,
        function_name: 'after_turn_middleware',
        input_data: { intent, outcome },
        success_status: outcome === 'success',
        execution_time_ms: 0,
        timestamp: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'After-turn processing completed',
        memorySummary: summaryText,
        learningInsights
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in after-turn middleware:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});