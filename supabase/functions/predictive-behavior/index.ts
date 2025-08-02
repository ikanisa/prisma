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
    const { user_id, interaction_history } = await req.json();

      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Analyzing predictive behavior for user: ${user_id}`);

    // Get user's conversation history
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_messages(message_text, sender, created_at)
      `)
      .eq('contact_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (convError) {
      throw new Error(`Failed to fetch conversations: ${convError.message}`);
    }

    // Get user memory patterns
    const { data: memory, error: memError } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('user_id', user_id);

    if (memError) {
      console.warn('Failed to fetch user memory:', memError.message);
    }

    // Analyze patterns
    const patterns = {
      communication_style: 'formal',
      preferred_time: 'morning',
      response_speed: 'fast',
      topics_of_interest: [],
      likely_next_action: 'browse_products',
      engagement_score: 0.7,
      churn_risk: 'low'
    };

    if (conversations && conversations.length > 0) {
      // Analyze communication patterns
      const totalMessages = conversations.reduce((sum, conv) => 
        sum + (conv.conversation_messages?.length || 0), 0);
      
      const avgResponseTime = conversations.reduce((sum, conv) => {
        if (conv.conversation_messages && conv.conversation_messages.length > 1) {
          const times = conv.conversation_messages
            .map(msg => new Date(msg.created_at).getTime())
            .sort((a, b) => a - b);
          
          for (let i = 1; i < times.length; i++) {
            sum += times[i] - times[i-1];
          }
        }
        return sum;
      }, 0) / Math.max(totalMessages - conversations.length, 1);

      patterns.response_speed = avgResponseTime < 60000 ? 'fast' : 
                               avgResponseTime < 300000 ? 'medium' : 'slow';

      // Predict engagement
      const recentActivity = conversations.filter(conv => 
        new Date(conv.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      patterns.engagement_score = Math.min(recentActivity / 3, 1);
      patterns.churn_risk = patterns.engagement_score < 0.3 ? 'high' : 
                           patterns.engagement_score < 0.6 ? 'medium' : 'low';

      // Extract topics
      const allMessages = conversations.flatMap(conv => 
        conv.conversation_messages?.map(msg => msg.message_text) || []
      );
      
      const keywords = ['ride', 'product', 'price', 'location', 'payment', 'booking'];
      patterns.topics_of_interest = keywords.filter(keyword =>
        allMessages.some(msg => msg?.toLowerCase().includes(keyword))
      );
    }

    // Store predictions
    await supabase
      .from('agent_memory')
      .upsert({
        user_id,
        memory_type: 'behavioral_patterns',
        memory_value: JSON.stringify(patterns),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,memory_type' });

    return new Response(
      JSON.stringify({
        success: true,
        predictions: patterns,
        confidence: 0.75,
        updated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in predictive behavior analysis:', error);
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