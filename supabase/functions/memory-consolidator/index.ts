import { supabaseClient } from "./client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, conversation_summary, learning_insights } = await req.json();

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Consolidating memory for user: ${user_id}`);

    // Store user preferences and patterns
    if (learning_insights?.preferences) {
      await supabase
        .from('agent_memory')
        .upsert({
          user_id,
          memory_type: 'preferences',
          memory_value: JSON.stringify(learning_insights.preferences),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,memory_type' });
    }

    // Store conversation patterns
    if (learning_insights?.patterns) {
      await supabase
        .from('agent_memory')
        .upsert({
          user_id,
          memory_type: 'patterns',
          memory_value: JSON.stringify(learning_insights.patterns),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,memory_type' });
    }

    // Store conversation summary
    if (conversation_summary) {
      await supabase
        .from('agent_memory')
        .upsert({
          user_id,
          memory_type: 'conversation_history',
          memory_value: conversation_summary,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,memory_type' });
    }

    // Log learning insights
    await supabase
      .from('conversation_learning_log')
      .insert({
        user_id,
        learning_summary: conversation_summary,
        improvement_note: learning_insights?.improvements || null,
        confidence_level: learning_insights?.confidence || 0.5
      });

    console.log('Memory consolidation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Memory consolidated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in memory consolidation:', error);
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