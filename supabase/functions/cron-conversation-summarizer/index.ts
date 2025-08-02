import { supabaseClient } from "./client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting conversation summarization cron job...')

    // Call the summarization function
    const { error: summaryError } = await supabase.rpc('summarize_daily_conversations')

    if (summaryError) {
      console.error('Summarization error:', summaryError)
      return new Response(
        JSON.stringify({ error: 'Failed to summarize conversations', details: summaryError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up old conversations (runs after summarization)
    const { error: cleanupError } = await supabase.rpc('cleanup_old_conversations')

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError)
      // Don't fail the whole job for cleanup errors
    }

    // Get some stats for the response
    const { data: todayStats } = await supabase
      .from('conversation_summaries')
      .select('user_id, message_count')
      .eq('summary_date', new Date().toISOString().split('T')[0])

    const totalUsers = todayStats?.length || 0
    const totalMessages = todayStats?.reduce((sum, stat) => sum + (stat.message_count || 0), 0) || 0

    const result = {
      success: true,
      job: 'conversation_summarizer',
      timestamp: new Date().toISOString(),
      stats: {
        users_summarized: totalUsers,
        total_messages_processed: totalMessages
      },
      message: `Successfully processed conversations for ${totalUsers} users (${totalMessages} messages)`
    }

    console.log('Conversation summarization completed:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in conversation summarizer cron:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})