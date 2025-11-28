import { serve } from 'https://deno.land/std@0.218.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify auth
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user && path !== 'health') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Route handlers
    switch (path) {
      case 'chat':
        return await handleChat(req, supabaseClient, user);
      case 'rag':
        return await handleRAG(req, supabaseClient, user);
      case 'analytics':
        return await handleAnalytics(req, supabaseClient, user);
      case 'health':
        return new Response(
          JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      default:
        return new Response(
          JSON.stringify({ error: 'Route not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleChat(req: Request, supabase: any, user: any) {
  const { messages } = await req.json();

  // Save to database
  const { data: session } = await supabase
    .from('chat_sessions')
    .insert({ user_id: user.id })
    .select()
    .single();

  // Call OpenAI
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      stream: true,
    }),
  });

  return new Response(openaiResponse.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

async function handleRAG(req: Request, supabase: any, user: any) {
  const { query, filters } = await req.json();

  // Generate embedding
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
    }),
  });

  const { data: [{ embedding }] } = await embeddingResponse.json();

  // Vector search
  const { data: documents } = await supabase.rpc('match_vectors', {
    query_embedding: embedding,
    match_threshold: 0.75,
    match_count: 10,
    filter: filters,
  });

  return new Response(
    JSON.stringify({ documents }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAnalytics(req: Request, supabase: any, user: any) {
  const { event, properties } = await req.json();

  await supabase
    .from('analytics_events')
    .insert({
      event,
      properties,
      user_id: user?.id,
      user_agent: req.headers.get('User-Agent'),
    });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
