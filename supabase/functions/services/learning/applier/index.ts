import { getServiceSupabaseClient } from '../../../_shared/supabase-client.ts';

const supabasePromise = getServiceSupabaseClient();

async function fetchNextPolicyVersion(orgId: string, supabase: Awaited<ReturnType<typeof getServiceSupabaseClient>>) {
  const { data, error } = await supabase
    .from('agent_policy_versions')
    .select('version')
    .eq('org_id', orgId)
    .order('version', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const latest = data?.[0]?.version ?? 0;
  return latest + 1;
}

async function applyQueryHintJob(job: any, supabase: Awaited<ReturnType<typeof getServiceSupabaseClient>>) {
  const now = new Date().toISOString();
  const payload = job.payload ?? {};
  const suggestion = payload.suggestion ?? {};

  const hint = {
    hint_type: suggestion.hint_type ?? 'allowlist',
    phrase: suggestion.phrase ?? 'site:legifrance.gouv.fr',
    weight: suggestion.weight ?? 1.0,
    juris_code: suggestion.juris_code ?? null,
    topic: suggestion.topic ?? null,
  };

  const nextVersion = await fetchNextPolicyVersion(job.org_id, supabase);
  const summary = payload.reason ?? 'Automated query hint adjustment';

  const { data: policyRows, error: policyError } = await supabase
    .from('agent_policy_versions')
    .insert({
      org_id: job.org_id,
      version: nextVersion,
      status: 'active',
      summary,
      diff: { jobId: job.id, hint },
    })
    .select('id')
    .single();

  if (policyError) {
    throw policyError;
  }

  const policyId = policyRows.id;

  const { error: hintError } = await supabase.from('query_hints').insert({
    org_id: job.org_id,
    hint_type: hint.hint_type,
    phrase: hint.phrase,
    weight: hint.weight,
    juris_code: hint.juris_code,
    topic: hint.topic,
    policy_version_id: policyId,
  });

  if (hintError) {
    throw hintError;
  }

  const { error: updateError } = await supabase
    .from('agent_learning_jobs')
    .update({
      status: 'APPLIED',
      result: { applied_hint: hint, policy_version_id: policyId },
      policy_version_id: policyId,
      processed_at: now,
      updated_at: now,
    })
    .eq('id', job.id);

  if (updateError) {
    throw updateError;
  }
}

Deno.serve(async (req) => {
  const supabase = await supabasePromise;
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(25, Number(url.searchParams.get('limit') ?? '5')));

  const { data: jobs, error: jobsError } = await supabase
    .from('agent_learning_jobs')
    .select('id, org_id, kind, status, payload')
    .eq('status', 'READY')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (jobsError) {
    return new Response(JSON.stringify({ success: false, error: jobsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let applied = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    const startUpdate = await supabase
      .from('agent_learning_jobs')
      .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'READY');

    if (startUpdate.error) {
      failed += 1;
      continue;
    }

    try {
      if (job.kind === 'query_hint_add') {
        await applyQueryHintJob(job, supabase);
        applied += 1;
      } else {
        const { error: skipError } = await supabase
          .from('agent_learning_jobs')
          .update({
            status: 'FAILED',
            result: { error: 'unsupported_job_kind' },
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        if (skipError) {
          throw skipError;
        }
        failed += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase
        .from('agent_learning_jobs')
        .update({
          status: 'FAILED',
          result: { error: message },
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      failed += 1;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      evaluated: jobs?.length ?? 0,
      applied,
      failed,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
