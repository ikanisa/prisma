import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveSummaryRequest {
  userId: string;
  summary: string;
  startTs: string;
  endTs: string;
  messageCount?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const { userId, summary, startTs, endTs, messageCount = 0 }: SaveSummaryRequest = await req.json();

    console.log(`💾 Saving conversation summary for user: ${userId}`);

    // Insert new conversation summary
    const { data, error } = await supabase
      .from('conversation_summaries')
      .insert({
        user_id: userId,
        summary,
        start_ts: startTs,
        end_ts: endTs,
        message_count: messageCount
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Clean up old summaries (keep only last 5 for each user)
    const { data: oldSummaries, error: selectError } = await supabase
      .from('conversation_summaries')
      .select('id')
      .eq('user_id', userId)
      .order('end_ts', { ascending: false })
      .range(5, 1000); // Get summaries beyond the 5 most recent

    if (selectError) {
      console.error('Error selecting old summaries:', selectError);
    } else if (oldSummaries && oldSummaries.length > 0) {
      const idsToDelete = oldSummaries.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('conversation_summaries')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error deleting old summaries:', deleteError);
      } else {
        console.log(`🗑️ Cleaned up ${idsToDelete.length} old summaries for user ${userId}`);
      }
    }

    console.log(`✅ Saved conversation summary for user ${userId}:`, data);

    return new Response(JSON.stringify({ 
      success: true, 
      summary: data,
      cleaned: oldSummaries?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in save-short-summary:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
