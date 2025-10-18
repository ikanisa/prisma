import { NextResponse } from 'next/server';

import { getServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(Number(limitParam) || 25, 100) : 25;

  if (!orgId) {
    return NextResponse.json({ error: 'orgId query parameter is required.' }, { status: 400 });
  }

  const supabase = await getServiceSupabaseClient();

  const [{ data: coverage, error: coverageError }, { data: sla, error: slaError }, { data: refusals, error: refusalError }] =
    await Promise.all([
      supabase
        .from('telemetry_coverage_metrics')
        .select('module, metric, measured_value, population, coverage_ratio, period_start, period_end, computed_at')
        .eq('org_id', orgId)
        .order('period_start', { ascending: false })
        .limit(limit),
      supabase
        .from('telemetry_service_levels')
        .select('module, workflow_event, status, open_breaches, target_hours, computed_at')
        .eq('org_id', orgId)
        .order('computed_at', { ascending: false })
        .limit(limit),
      supabase
        .from('telemetry_refusal_events')
        .select('module, event, reason, severity, count, occurred_at')
        .eq('org_id', orgId)
        .order('occurred_at', { ascending: false })
        .limit(limit),
    ]);

  if (coverageError || slaError || refusalError) {
    return NextResponse.json({ error: 'telemetry_query_failed' }, { status: 500 });
  }

  const coverageMap: Record<string, NonNullable<typeof coverage>[number]> = {};
  for (const row of coverage ?? []) {
    const key = `${row.module}:${row.metric}`;
    if (!coverageMap[key]) {
      coverageMap[key] = row;
    }
  }

  const slaMap: Record<string, NonNullable<typeof sla>[number]> = {};
  for (const row of sla ?? []) {
    const key = `${row.module}:${row.workflow_event}`;
    if (!slaMap[key]) {
      slaMap[key] = row;
    }
  }

  return NextResponse.json({
    coverage: Object.values(coverageMap),
    serviceLevels: Object.values(slaMap),
    refusals: refusals ?? [],
  });
}
