import { getServiceSupabaseClient } from '../../../_shared/supabase-client.ts';

const supabasePromise = getServiceSupabaseClient();

function minutesToMs(minutes: number): number {
  return Math.max(1, minutes) * 60 * 1000;
}

Deno.serve(async (req) => {
  const supabase = await supabasePromise;
  const url = new URL(req.url);
  const windowMinutes = Number(url.searchParams.get('window') ?? '15');
  const since = new Date(Date.now() - minutesToMs(windowMinutes)).toISOString();

  const { data: runs, error: runsError } = await supabase
    .from('learning_runs')
    .select('id, org_id, agent_kind, mode, status, stats, created_at, finished_at')
    .gte('created_at', since);

  if (runsError) {
    return new Response(JSON.stringify({ success: false, error: runsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const signals: Array<{
    org_id: string;
    run_id: string | null;
    source: string;
    kind: string;
    payload: Record<string, unknown>;
  }> = [];

  for (const run of runs ?? []) {
    signals.push({
      org_id: run.org_id,
      run_id: run.id,
      source: 'learning_run',
      kind: `run_status:${run.status}`,
      payload: {
        agent_kind: run.agent_kind,
        mode: run.mode,
        finished_at: run.finished_at,
        stats: run.stats ?? {},
      },
    });
  }

  const { data: feedback, error: feedbackError } = await supabase
    .from('agent_feedback')
    .select('id, org_id, rating, created_at')
    .gte('created_at', since);

  if (feedbackError) {
    return new Response(JSON.stringify({ success: false, error: feedbackError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  for (const item of feedback ?? []) {
    const rating = Number(item.rating ?? 0);
    const sentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
    signals.push({
      org_id: item.org_id,
      run_id: null,
      source: 'agent_feedback',
      kind: `feedback:${sentiment}`,
      payload: {
        rating,
        created_at: item.created_at,
      },
    });
  }

  let inserted = 0;
  if (signals.length) {
    const { error: insertError } = await supabase.from('learning_signals').insert(signals);
    if (insertError) {
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    inserted = signals.length;
  }

  return new Response(
    JSON.stringify({
      success: true,
      windowMinutes,
      inserted,
      runsProcessed: runs?.length ?? 0,
      feedbackProcessed: feedback?.length ?? 0,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
