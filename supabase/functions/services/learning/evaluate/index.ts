import { getServiceSupabaseClient } from '../../../_shared/supabase-client.ts';

const supabasePromise = getServiceSupabaseClient();

function hoursToMs(hours: number): number {
  return Math.max(1, hours) * 60 * 60 * 1000;
}

async function fetchLatestMetric(orgId: string, metric: string, since: string, supabase: Awaited<ReturnType<typeof getServiceSupabaseClient>>) {
  const { data, error } = await supabase
    .from('learning_metrics')
    .select('value, dims, computed_at')
    .eq('org_id', orgId)
    .eq('metric', metric)
    .gte('computed_at', since)
    .order('computed_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

async function fetchActivePolicyVersion(orgId: string, supabase: Awaited<ReturnType<typeof getServiceSupabaseClient>>) {
  const { data, error } = await supabase
    .from('agent_policy_versions')
    .select('id, version, status')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

async function rollbackPolicy(orgId: string, policyId: string, supabase: Awaited<ReturnType<typeof getServiceSupabaseClient>>) {
  const now = new Date().toISOString();

  const { error: hintsError } = await supabase
    .from('query_hints')
    .delete()
    .eq('policy_version_id', policyId);

  if (hintsError) {
    throw hintsError;
  }

  const { error: updatePolicyError } = await supabase
    .from('agent_policy_versions')
    .update({ status: 'rolled_back', rolled_back_at: now, updated_at: now })
    .eq('id', policyId);

  if (updatePolicyError) {
    throw updatePolicyError;
  }

  const signal = {
    org_id: orgId,
    run_id: null,
    source: 'evaluate_and_gate',
    kind: 'policy_rolled_back',
    payload: { policy_version_id: policyId },
  };

  await supabase.from('learning_signals').insert(signal);
}

Deno.serve(async (req) => {
  const supabase = await supabasePromise;
  const url = new URL(req.url);
  const windowHours = Number(url.searchParams.get('hours') ?? '24');
  const threshold = Number(url.searchParams.get('threshold') ?? '0.85');
  const since = new Date(Date.now() - hoursToMs(windowHours)).toISOString();

  const { data: orgRows, error: orgError } = await supabase
    .from('organizations')
    .select('id');

  if (orgError) {
    return new Response(JSON.stringify({ success: false, error: orgError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let evaluated = 0;
  let rollbacks = 0;

  for (const org of orgRows ?? []) {
    if (!org.id) continue;
    evaluated += 1;
    const metric = await fetchLatestMetric(org.id, 'run_success_rate', since, supabase);
    if (!metric) {
      continue;
    }
    if (metric.value < threshold) {
      const policy = await fetchActivePolicyVersion(org.id, supabase);
      if (policy) {
        await rollbackPolicy(org.id, policy.id, supabase);
        rollbacks += 1;
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, windowHours, threshold, evaluated, rollbacks }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
