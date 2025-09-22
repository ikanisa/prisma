// ============================================================================
// Memory Consolidator v2 - Advanced Learning Pipeline
// Handles conversation summarization, user learning, and vector memory
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const PINECONE_ENVIRONMENT = Deno.env.get('PINECONE_ENVIRONMENT') || 'gcp-starter';
const PINECONE_INDEX = 'omni-agent';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, timeframe } = await req.json();
    let result;

    switch (action) {
      case 'consolidate_user':
        result = await consolidateUserMemory(userId, timeframe || '24h');
        break;
      case 'consolidate_all':
        result = await consolidateAllUsers(timeframe || '24h');
        break;
      case 'summarize_conversations':
        result = await summarizeRecentConversations(userId, timeframe || '1h');
        break;
      case 'learn_preferences':
        result = await learnUserPreferences(userId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in memory-consolidator-v2:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// Memory Consolidation Functions
// ============================================================================

async function consolidateUserMemory(userId: string, timeframe: string) {
  console.log(`🧠 Consolidating memory for user ${userId} (${timeframe})`);
  
  const cutoff = getTimeframeCutoff(timeframe);
  
  // Get recent conversations
  const { data: conversations } = await supabase
    .from('agent_conversations')
    .select('*')
    .eq('user_id', userId)
    .gte('ts', cutoff)
    .order('ts', { ascending: true });

  if (!conversations || conversations.length === 0) {
    return { message: 'No conversations to consolidate' };
  }

  // Group conversations into turns
  const turns = groupConversationsIntoTurns(conversations);
  
  // Generate summary
  const summary = await generateConversationSummary(turns, userId);
  
  // Store summary in database
  await supabase.from('conversation_summaries').upsert({
    user_id: userId,
    summary_text: summary,
    summary_date: new Date().toISOString().split('T')[0],
    conversation_count: turns.length
  });

  // Generate and store vector embedding
  const embedding = await generateEmbedding(summary);
  await storeVectorMemory(userId, summary, embedding);

  // Learn user preferences from this session
  await learnUserPreferences(userId, conversations);

  return {
    message: `Consolidated ${turns.length} conversation turns`,
    summary: summary.substring(0, 200) + '...'
  };
}

async function consolidateAllUsers(timeframe: string) {
  console.log(`🧠 Consolidating memory for all users (${timeframe})`);
  
  const cutoff = getTimeframeCutoff(timeframe);
  
  // Get unique users with recent activity
  const { data: activeUsers } = await supabase
    .from('agent_conversations')
    .select('user_id')
    .gte('ts', cutoff)
    .order('user_id');

  if (!activeUsers) return { message: 'No active users found' };

  const uniqueUsers = [...new Set(activeUsers.map(u => u.user_id))];
  const results = [];

  for (const userId of uniqueUsers) {
    try {
      const result = await consolidateUserMemory(userId, timeframe);
      results.push({ userId, ...result });
    } catch (error) {
      console.error(`Failed to consolidate for user ${userId}:`, error);
      results.push({ userId, error: error.message });
    }
  }

  return {
    message: `Processed ${uniqueUsers.length} users`,
    results
  };
}

async function summarizeRecentConversations(userId?: string, timeframe: string = '1h') {
  const cutoff = getTimeframeCutoff(timeframe);
  
  let query = supabase
    .from('agent_conversations')
    .select('*')
    .gte('ts', cutoff);
    
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: conversations } = await query.order('ts', { ascending: true });

  if (!conversations || conversations.length === 0) {
    return { message: 'No recent conversations found' };
  }

  // Group by user
  const userConversations = conversations.reduce((acc, conv) => {
    if (!acc[conv.user_id]) acc[conv.user_id] = [];
    acc[conv.user_id].push(conv);
    return acc;
  }, {} as Record<string, any[]>);

  const summaries = [];
  for (const [uid, convs] of Object.entries(userConversations)) {
    const turns = groupConversationsIntoTurns(convs);
    if (turns.length > 0) {
      const summary = await generateConversationSummary(turns, uid);
      summaries.push({ userId: uid, summary, turnCount: turns.length });
    }
  }

  return {
    message: `Summarized conversations for ${Object.keys(userConversations).length} users`,
    summaries
  };
}

// ============================================================================
// User Preference Learning
// ============================================================================

async function learnUserPreferences(userId: string, conversations?: any[]) {
  console.log(`🎯 Learning preferences for user ${userId}`);

  if (!conversations) {
    const { data } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('ts', { ascending: false })
      .limit(50);
    conversations = data || [];
  }

  if (conversations.length === 0) {
    return { message: 'No conversations to learn from' };
  }

  // Analyze patterns using OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `Analyze user conversations to extract preferences and patterns. Return JSON with:
        {
          "momo_number": "detected mobile money number",
          "preferred_language": "detected language preference", 
          "favorite_services": ["list of frequently used services"],
          "usage_patterns": "description of when/how they use the service",
          "payment_behavior": "typical payment amounts and frequency",
          "location_hints": "frequently mentioned locations"
        }`
      }, {
        role: 'user',
        content: `Conversation history for user learning:\n${conversations.map(c => 
          `${c.role}: ${c.message}`).join('\n')}`
      }],
      temperature: 0.2
    }),
  });

  const data = await response.json();
  const preferences = JSON.parse(data.choices[0].message.content);

  // Update user profile with learned preferences
  const updates: any = {};
  if (preferences.momo_number && preferences.momo_number !== 'not_detected') {
    updates.momo_number = preferences.momo_number;
  }
  if (preferences.preferred_language) {
    updates.language = preferences.preferred_language;
  }
  if (preferences.favorite_services) {
    updates.preferred_service = preferences.favorite_services[0];
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('user_profiles').upsert({
      user_id: userId,
      ...updates,
      updated_at: new Date().toISOString()
    });
  }

  return {
    message: 'Learned user preferences',
    preferences,
    updates
  };
}

// ============================================================================
// Vector Memory Management
// ============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

async function storeVectorMemory(userId: string, summary: string, embedding: number[]) {
  if (!PINECONE_API_KEY) {
    console.warn('⚠️ Pinecone not configured, skipping vector storage');
    return;
  }

  try {
    const response = await fetch(
      `https://${PINECONE_INDEX}-${PINECONE_ENVIRONMENT}.svc.pinecone.io/vectors/upsert`,
      {
        method: 'POST',
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: 'user-memories',
          vectors: [{
            id: `${userId}-${Date.now()}`,
            values: embedding,
            metadata: {
              userId,
              summary,
              timestamp: new Date().toISOString(),
              type: 'conversation_summary'
            }
          }]
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Pinecone error: ${response.statusText}`);
    }

    console.log(`📌 Stored vector memory for user ${userId}`);
  } catch (error) {
    console.error('Failed to store vector memory:', error);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function groupConversationsIntoTurns(conversations: any[]) {
  const turns = [];
  let currentTurn: any = null;

  for (const conv of conversations) {
    if (conv.role === 'user') {
      if (currentTurn) {
        turns.push(currentTurn);
      }
      currentTurn = {
        userMessage: conv.message,
        agentResponse: '',
        timestamp: conv.ts,
        metadata: conv.metadata || {}
      };
    } else if (conv.role === 'agent' && currentTurn) {
      currentTurn.agentResponse = conv.message;
      currentTurn.agentMetadata = conv.metadata || {};
    }
  }

  if (currentTurn) {
    turns.push(currentTurn);
  }

  return turns;
}

async function generateConversationSummary(turns: any[], userId: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `Summarize this conversation session in 1-2 sentences. Focus on:
        - Main intent/goal of the user
        - Key outcomes or decisions
        - Any preferences or patterns observed
        Keep it concise and factual.`
      }, {
        role: 'user',
        content: `Conversation turns for user ${userId}:\n${turns.map((turn, i) => 
          `Turn ${i+1}:\nUser: ${turn.userMessage}\nAgent: ${turn.agentResponse}`
        ).join('\n\n')}`
      }],
      temperature: 0.3
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

function getTimeframeCutoff(timeframe: string): string {
  const now = new Date();
  let cutoff: Date;

  switch (timeframe) {
    case '1h':
      cutoff = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoff = new Date(now.getTime() - 60 * 60 * 1000); // Default 1 hour
  }

  return cutoff.toISOString();
}