import { getServiceSupabaseClient } from '../../../_shared/supabase-client.ts';

const supabasePromise = getServiceSupabaseClient();

function hoursToMs(hours: number): number {
  return Math.max(1, hours) * 60 * 60 * 1000;
}

interface RunStats {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
}

function ensureOrgStats(map: Map<string, RunStats>, orgId: string): RunStats {
  if (!map.has(orgId)) {
    map.set(orgId, { totalRuns: 0, completedRuns: 0, failedRuns: 0 });
  }
  return map.get(orgId)!;
}

async function jobExists(orgId: string, kind: string, supabase: Awaited<ReturnType<typeof getServiceSupabaseClient>>): Promise<boolean> {
  const { data, error } = await supabase
    .from('agent_learning_jobs')
    .select('id')
    .eq('org_id', orgId)
    .eq('kind', kind)
    .in('status', ['PENDING', 'READY', 'IN_PROGRESS'])
    .limit(1);

  if (error) {
    throw error;
  }

  return (data ?? []).length > 0;
}

Deno.serve(async (req) => {
  const supabase = await supabasePromise;
  const url = new URL(req.url);
  const windowHours = Number(url.searchParams.get('hours') ?? '24');
  const since = new Date(Date.now() - hoursToMs(windowHours)).toISOString();

  const { data: signals, error: signalsError } = await supabase
    .from('learning_signals')
    .select('org_id, kind, payload, created_at')
    .gte('created_at', since);

  if (signalsError) {
    return new Response(JSON.stringify({ success: false, error: signalsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const runStats = new Map<string, RunStats>();
  const orgs = new Set<string>();

  for (const signal of signals ?? []) {
    if (!signal.org_id) continue;
    orgs.add(signal.org_id);
    if (signal.kind.startsWith('run_status:')) {
      const status = signal.kind.split(':')[1];
      const stats = ensureOrgStats(runStats, signal.org_id);
      stats.totalRuns += 1;
      if (status === 'completed') {
        stats.completedRuns += 1;
      }
      if (status === 'failed' || status === 'errored') {
        stats.failedRuns += 1;
      }
    }
  }

  const now = new Date().toISOString();
  let metricsWritten = 0;
  let jobsCreated = 0;

  for (const [orgId, stats] of runStats.entries()) {
    const successRate = stats.totalRuns > 0 ? stats.completedRuns / stats.totalRuns : 1;

    const metricInsert = {
      org_id: orgId,
      window_name: `${windowHours}h`,
      metric: 'run_success_rate',
      value: successRate,
      dims: {
        total_runs: stats.totalRuns,
        completed_runs: stats.completedRuns,
        failed_runs: stats.failedRuns,
      },
      computed_at: now,
    };

    const { error: metricError } = await supabase.from('learning_metrics').insert(metricInsert);
    if (metricError) {
      return new Response(JSON.stringify({ success: false, error: metricError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    metricsWritten += 1;

    if (stats.totalRuns >= 3 && successRate < 0.9) {
      const existing = await jobExists(orgId, 'query_hint_add', supabase);
      if (!existing) {
        const payload = {
          reason: 'run_success_rate_below_threshold',
          threshold: 0.9,
          value: successRate,
          total_runs: stats.totalRuns,
          suggestion: {
            hint_type: 'allowlist',
            phrase: 'site:legifrance.gouv.fr',
            weight: 1.2,
            juris_code: 'FR',
          },
        };

        const { error: jobError } = await supabase.from('agent_learning_jobs').insert({
          org_id: orgId,
          kind: 'query_hint_add',
          status: 'PENDING',
          payload,
        });

        if (jobError) {
          return new Response(JSON.stringify({ success: false, error: jobError.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        jobsCreated += 1;
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      windowHours,
      metricsWritten,
      jobsCreated,
      orgsEvaluated: orgs.size,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
