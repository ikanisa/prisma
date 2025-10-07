import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '../../../../lib/supabase-server';

function traceIdFromHeaders(request: Request): string {
  const header = request.headers.get('x-request-id') ?? request.headers.get('X-Request-ID');
  if (header) return header;
  return `analytics-${crypto.randomUUID()}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const supabase = await getServiceSupabaseClient();

  const coverageQuery = supabase
    .from('telemetry_coverage_metrics')
    .select('module, metric, coverage_ratio, measured_value, population, computed_at, period_start, period_end')
    .eq('org_id', orgId)
    .order('computed_at', { ascending: false })
    .limit(20);

  const slaQuery = supabase
    .from('telemetry_service_levels')
    .select('module, workflow_event, status, open_breaches, target_hours, computed_at')
    .eq('org_id', orgId)
    .order('computed_at', { ascending: false })
    .limit(20);

  const jobsQuery = supabase
    .from('jobs')
    .select('status, kind, scheduled_at, finished_at')
    .eq('org_id', orgId)
    .order('scheduled_at', { ascending: false })
    .limit(50);

  const npsQuery = supabase
    .from('nps_responses')
    .select('score, submitted_at, feedback')
    .eq('org_id', orgId)
    .order('submitted_at', { ascending: false })
    .limit(30);

  const [coverageResult, slaResult, jobsResult, npsResult] = await Promise.all([
    coverageQuery,
    slaQuery,
    jobsQuery,
    npsQuery,
  ]);

  const traceId = traceIdFromHeaders(request);

  const jobStats = (jobsResult.data ?? []).reduce(
    (acc, row) => {
      const status = (row.status ?? 'PENDING').toUpperCase();
      acc.byStatus[status] = (acc.byStatus[status] ?? 0) + 1;
      if (row.finished_at) {
        const duration = new Date(row.finished_at).getTime() - new Date(row.scheduled_at ?? row.finished_at).getTime();
        if (!Number.isNaN(duration)) {
          acc.durations.push(duration / 1000);
        }
      }
      return acc;
    },
    { byStatus: {} as Record<string, number>, durations: [] as number[] },
  );

  const averageDurationSeconds = jobStats.durations.length
    ? jobStats.durations.reduce((sum, value) => sum + value, 0) / jobStats.durations.length
    : null;

  const npsScores = npsResult.data ?? [];
  const promoters = npsScores.filter((row) => row.score >= 9).length;
  const detractors = npsScores.filter((row) => row.score <= 6).length;
  const passives = npsScores.length - promoters - detractors;
  const npsScore = npsScores.length
    ? Math.round(((promoters - detractors) / npsScores.length) * 100)
    : null;

  return NextResponse.json(
    {
      traceId,
      coverage: coverageResult.data ?? [],
      slas: slaResult.data ?? [],
      jobs: {
        summary: jobStats.byStatus,
        averageDurationSeconds,
        totalRuns: jobsResult.data?.length ?? 0,
      },
      nps: {
        score: npsScore,
        promoters,
        passives,
        detractors,
        responses: npsScores,
      },
    },
    { status: 200 },
  );
}
