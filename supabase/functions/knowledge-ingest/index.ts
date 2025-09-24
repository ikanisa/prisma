import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

interface ScheduleBody {
  orgId?: string;
  agentKind?: 'AUDIT' | 'FINANCE' | 'TAX';
  mode?: 'INITIAL' | 'CONTINUOUS';
  corpusId?: string;
  sourceId?: string;
  initiatedBy?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as ScheduleBody;
    const { orgId, agentKind, mode, corpusId, sourceId, initiatedBy } = body;

    if (!orgId || !agentKind || !mode || !corpusId || !sourceId || !initiatedBy) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: corpus, error: corpusError } = await supabase
      .from('knowledge_corpora')
      .select('org_id')
      .eq('id', corpusId)
      .maybeSingle();

    if (corpusError || !corpus || corpus.org_id !== orgId) {
      return new Response(JSON.stringify({ error: 'invalid_corpus' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .select('id, corpus_id')
      .eq('id', sourceId)
      .maybeSingle();

    if (sourceError || !source || source.corpus_id !== corpusId) {
      return new Response(JSON.stringify({ error: 'invalid_source' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: run, error: runError } = await supabase
      .from('learning_runs')
      .insert({
        org_id: orgId,
        agent_kind: agentKind,
        mode,
        status: 'queued',
        stats: { messages: ['Edge function placeholder - awaiting Drive integration'] },
      })
      .select('id, status')
      .single();

    if (runError || !run) {
      throw runError ?? new Error('learning_run_insert_failed');
    }

    await supabase.from('knowledge_events').insert({
      org_id: orgId,
      run_id: run.id,
      type: 'INGEST',
      payload: {
        initiatedBy,
        corpusId,
        sourceId,
        placeholder: true,
      },
    });

    return new Response(JSON.stringify({ run }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('knowledge-ingest.error', error);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
