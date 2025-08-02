import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserContextRequest {
  userId: string;
  query?: string;
  sessionId?: string;
}

interface UserProfile {
  user_id: string;
  language: string;
  default_wallet?: string;
  name?: string;
  preferences: Record<string, any>;
}

interface ConversationSummary {
  summary: string;
  start_ts: string;
  end_ts: string;
  message_count: number;
}

interface VectorHit {
  chunk: string;
  score: number;
  metadata?: Record<string, any>;
}

interface UserContextResponse {
  profile: UserProfile | null;
  recentSummary: string;
  lastOrders: any[];
  vectorHits: VectorHit[];
  ephemeralMemory: any;
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

    const { userId, query, sessionId }: UserContextRequest = await req.json();

    console.log(`📋 Getting user context for user: ${userId}`);

    // 1️⃣ Get user profile - handle phone as text ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone_number', userId) // Use phone_number instead of user_id for phone lookup
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile error:', profileError);
    }

    // 2️⃣ Get latest conversation summary - use phone directly
    const { data: summaryRow, error: summaryError } = await supabase
      .from('conversation_summaries')
      .select('summary, start_ts, end_ts, message_count')
      .eq('phone_number', userId) // Use phone_number field
      .order('end_ts', { ascending: false })
      .limit(1)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') {
      console.error('Summary error:', summaryError);
    }

    // 3️⃣ Get recent orders (use buyer_phone which exists)
    const { data: lastOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, status')
      .eq('buyer_phone', userId) // Use buyer_phone which exists in orders table
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) {
      console.error('Orders error:', ordersError);
    }

    // 4️⃣ Get ephemeral memory from cache
    let ephemeralMemory = null;
    if (sessionId) {
      const { data: memoryData, error: memoryError } = await supabase
        .from('memory_cache')
        .select('data')
        .eq('phone_number', userId) // Use phone_number field
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (memoryError && memoryError.code !== 'PGRST116') {
        console.error('Memory cache error:', memoryError);
      } else if (memoryData) {
        ephemeralMemory = memoryData.data;
      }
    }

    // 5️⃣ Vector search using semantic lookup (if query provided)
    let vectorHits: VectorHit[] = [];
    if (query) {
      try {
        // Call existing semantic lookup function
        const { data: semanticResults, error: semanticError } = await supabase.functions.invoke('semantic-lookup', {
          body: {
            query,
            namespace: `user_${userId}`,
            topK: 3
          }
        });

        if (semanticError) {
          console.error('Semantic lookup error:', semanticError);
        } else if (semanticResults?.matches) {
          vectorHits = semanticResults.matches.map((match: any) => ({
            chunk: match.metadata?.text || '',
            score: match.score || 0,
            metadata: match.metadata || {}
          }));
        }
      } catch (error) {
        console.error('Vector search failed:', error);
        // Continue without vector results rather than failing entirely
      }
    }

    const response: UserContextResponse = {
      profile,
      recentSummary: summaryRow?.summary || '',
      lastOrders: lastOrders || [],
      vectorHits,
      ephemeralMemory
    };

    console.log(`✅ Retrieved context for user ${userId}:`, {
      hasProfile: !!profile,
      hasSummary: !!summaryRow,
      orderCount: lastOrders?.length || 0,
      vectorHitCount: vectorHits.length,
      hasEphemeralMemory: !!ephemeralMemory
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-user-context:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      profile: null,
      recentSummary: '',
      lastOrders: [],
      vectorHits: [],
      ephemeralMemory: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});