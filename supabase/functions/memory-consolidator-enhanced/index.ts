import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsolidationRequest {
  userId?: string;
  timeframe?: string; // '24h', '7d', '30d'
  action: 'consolidate_user' | 'consolidate_all' | 'summarize_conversations';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const { userId, timeframe = '24h', action }: ConsolidationRequest = await req.json();

    console.log(`🧠 Running memory consolidation: ${action} for ${userId || 'all users'}`);

    switch (action) {
      case 'consolidate_user':
        if (!userId) {
          throw new Error('userId required for consolidate_user action');
        }
        return await consolidateUserMemory(supabase, userId, timeframe, openaiApiKey);
      
      case 'consolidate_all':
        return await consolidateAllUsers(supabase, timeframe, openaiApiKey);
      
      case 'summarize_conversations':
        return await summarizeRecentConversations(supabase, userId, timeframe, openaiApiKey);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in memory-consolidator-enhanced:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function consolidateUserMemory(
  supabase: any, 
  userId: string, 
  timeframe: string, 
  openaiApiKey: string
) {
  const cutoffDate = getTimeframeCutoff(timeframe);
  
  // Get recent conversations for this user
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, contact_phone, started_at, status')
    .eq('contact_phone', userId) // Assuming userId maps to phone
    .gte('started_at', cutoffDate)
    .order('started_at', { ascending: false });

  if (convError) {
    throw convError;
  }

  if (!conversations || conversations.length === 0) {
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'No conversations to consolidate',
      userId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get messages for these conversations
  const conversationIds = conversations.map(c => c.id);
  const { data: messages, error: msgError } = await supabase
    .from('conversation_messages')
    .select('conversation_id, sender, message, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: true });

  if (msgError) {
    throw msgError;
  }

  // Group messages by conversation
  const conversationTexts = conversations.map(conv => {
    const convMessages = messages.filter(m => m.conversation_id === conv.id);
    const messageText = convMessages
      .map(m => `${m.sender}: ${m.message}`)
      .join('\n');
    
    return {
      conversationId: conv.id,
      startTime: conv.started_at,
      text: messageText
    };
  });

  // Generate summary using OpenAI
  const summaryPrompt = `Analyze these recent conversations for user patterns, preferences, and key information that should be remembered for future interactions:

${conversationTexts.map(c => `[${c.startTime}]\n${c.text}`).join('\n\n---\n\n')}

Extract:
1. User preferences (language, payment methods, locations)
2. Behavioral patterns (usage times, service preferences)
3. Important context (ongoing transactions, complaints, relationships)
4. Facts to remember for personalization

Return a concise summary focusing on actionable insights for future conversations.`;

  // Use OpenAI SDK with Rwanda-first intelligence
  const systemPrompt = 'You are a memory consolidation system for easyMO Rwanda that extracts key user insights from conversation history. Focus on mobile money patterns, local business needs, and cultural preferences.';
  
  const consolidatedSummary = await generateIntelligentResponse(
    summaryPrompt,
    systemPrompt,
    [],
    {
      model: 'gpt-4.1-2025-04-14',
      temperature: 0.3,
      max_tokens: 1000
    }
  );

  // Save consolidated summary
  const startTime = conversationTexts[conversationTexts.length - 1]?.startTime || cutoffDate;
  const endTime = new Date().toISOString();

  const { error: saveError } = await supabase
    .from('conversation_summaries')
    .insert({
      user_id: userId,
      summary: consolidatedSummary,
      start_ts: startTime,
      end_ts: endTime,
      message_count: messages.length
    });

  if (saveError) {
    throw saveError;
  }

  // Store in vector database if available
  try {
    await supabase.functions.invoke('semantic-lookup', {
      body: {
        action: 'store',
        namespace: `user_${userId}`,
        texts: [consolidatedSummary],
        metadata: [{ 
          type: 'consolidated_memory', 
          timeframe, 
          created_at: endTime,
          conversation_count: conversations.length
        }]
      }
    });
  } catch (vectorError) {
    console.error('Failed to store in vector DB:', vectorError);
    // Continue without failing
  }

  console.log(`✅ Consolidated memory for user ${userId}: ${messages.length} messages from ${conversations.length} conversations`);

  return new Response(JSON.stringify({ 
    success: true,
    userId,
    conversationsProcessed: conversations.length,
    messagesProcessed: messages.length,
    summary: consolidatedSummary.substring(0, 200) + '...'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function consolidateAllUsers(supabase: any, timeframe: string, openaiApiKey: string) {
  const cutoffDate = getTimeframeCutoff(timeframe);
  
  // Get all users with recent activity
  const { data: activeUsers, error } = await supabase
    .from('conversations')
    .select('contact_phone')
    .gte('started_at', cutoffDate)
    .order('started_at', { ascending: false });

  if (error) {
    throw error;
  }

  const uniqueUsers = [...new Set(activeUsers.map(u => u.contact_phone))];
  const results = [];

  for (const userId of uniqueUsers) {
    try {
      // Process each user individually
      const response = await consolidateUserMemory(supabase, userId, timeframe, openaiApiKey);
      const result = await response.json();
      results.push({ userId, ...result });
    } catch (userError) {
      console.error(`Error consolidating memory for user ${userId}:`, userError);
      results.push({ userId, error: userError.message, success: false });
    }
  }

  console.log(`✅ Bulk consolidation complete: ${results.length} users processed`);

  return new Response(JSON.stringify({ 
    success: true,
    usersProcessed: results.length,
    results: results.slice(0, 10), // Return sample of results
    summary: `Processed ${results.filter(r => r.success).length}/${results.length} users successfully`
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function summarizeRecentConversations(
  supabase: any, 
  userId: string | undefined, 
  timeframe: string, 
  openaiApiKey: string
) {
  const cutoffDate = getTimeframeCutoff(timeframe);
  
  let query = supabase
    .from('conversations')
    .select('id, contact_phone, started_at, status, conversation_duration_minutes')
    .gte('started_at', cutoffDate);
  
  if (userId) {
    query = query.eq('contact_phone', userId);
  }

  const { data: conversations, error } = await query
    .order('started_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  // Clean up expired memory cache
  await supabase.from('memory_cache').delete().lt('expires_at', new Date().toISOString());

  console.log(`📊 Summary: ${conversations.length} conversations in ${timeframe}, cache cleaned`);

  return new Response(JSON.stringify({ 
    success: true,
    conversationCount: conversations.length,
    timeframe,
    userId: userId || 'all_users',
    cacheCleanupCompleted: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getTimeframeCutoff(timeframe: string): string {
  const now = new Date();
  switch (timeframe) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
}