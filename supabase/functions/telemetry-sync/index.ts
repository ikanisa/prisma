import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { logEdgeError } from '../_shared/error-notify.ts';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];

const roleRank: Record<RoleLevel, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  SYSTEM_ADMIN: 3,
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const handleOptions = (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

const createSupabaseClient = async (authHeader: string) =>
  createSupabaseClientWithAuth<Database>(authHeader);

const getUser = async (client: TypedClient) => {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'invalid_token');
  return data.user;
};

const getOrgContext = async (client: TypedClient, orgSlug: string | null, userId: string) => {
  if (!orgSlug) throw new HttpError(400, 'org_slug_required');
  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .maybeSingle();
  if (orgError) throw new HttpError(500, 'org_lookup_failed');
  if (!org) throw new HttpError(404, 'organization_not_found');

  const { data: membership, error: memberError } = await client
    .from('memberships')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (memberError) throw new HttpError(500, 'membership_lookup_failed');
  if (!membership) throw new HttpError(403, 'not_a_member');

  return { orgId: org.id, role: membership.role as RoleLevel };
};

const requireRole = (role: RoleLevel, min: RoleLevel) => {
  if (roleRank[role] < roleRank[min]) throw new HttpError(403, 'insufficient_role');
};

const parseDate = (value: unknown, fallback: Date) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return fallback;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const telemetryAlertWebhook = Deno.env.get('TELEMETRY_ALERT_WEBHOOK') ?? Deno.env.get('ERROR_NOTIFY_WEBHOOK') ?? null;
const retentionEnv = Deno.env.get('WEB_FETCH_CACHE_RETENTION_DAYS');
const parsedRetention = Number.parseInt(retentionEnv ?? '14', 10);
const WEB_CACHE_RETENTION_DAYS = Number.isFinite(parsedRetention) && parsedRetention > 0 ? parsedRetention : 14;
const WEB_CACHE_RETENTION_MS = WEB_CACHE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const getCount = async (
  client: TypedClient,
  params: { table: string; filters?: [column: string, operator: '=' | 'in', value: unknown][] },
) => {
  let query: any = client.from(params.table).select('*', { head: true, count: 'exact' });
  for (const filter of params.filters ?? []) {
    const [column, operator, value] = filter;
    if (operator === '=') query = query.eq(column, value);
    if (operator === 'in') query = query.in(column, value as string[]);
  }
  const { count, error } = await query;
  if (error) throw new HttpError(500, `${params.table}_count_failed`);
  return count ?? 0;
};

export async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'missing_authorization' }), { status: 401, headers: corsHeaders });

  const client = await createSupabaseClient(authHeader);

  let orgId: string | null = null;
  let orgSlug: string | null = null;
  let methodContext: Record<string, unknown> | undefined;

  try {
    const user = await getUser(client);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug : null;
    const context = await getOrgContext(client, orgSlug, user.id);
    orgId = context.orgId;
    requireRole(context.role, 'MANAGER');
    methodContext = { periodStart: body.periodStart, periodEnd: body.periodEnd };

    const now = new Date();
    const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    const periodStart = parseDate(body.periodStart, defaultStart);
    const periodEnd = parseDate(body.periodEnd, defaultEnd);

    const [engagements, openDisputes] = await Promise.all([
      getCount(client, { table: 'engagements', filters: [['org_id', '=', orgId]] }),
      getCount(client, {
        table: 'tax_dispute_cases',
        filters: [
          ['org_id', '=', orgId],
          ['status', 'in', ['OPEN', 'IN_PROGRESS', 'SUBMITTED']],
        ],
      }).catch(() => 0),
    ]);

    const { count: treatyCount, error: treatyError } = await client
      .from('treaty_wht_calculations')
      .select('id', { head: true, count: 'exact' })
      .eq('org_id', orgId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000).toISOString());
    if (treatyError) throw new HttpError(500, 'treaty_count_failed');

    const { count: overlayCount, error: overlayError } = await client
      .from('us_tax_overlay_calculations')
      .select('id', { head: true, count: 'exact' })
      .eq('org_id', orgId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000).toISOString());
    if (overlayError) throw new HttpError(500, 'overlay_count_failed');

    const coverageRows = [
      {
        org_id: orgId,
        module: 'TAX_TREATY_WHT',
        metric: 'treaty_calculations',
        measured_value: treatyCount ?? 0,
        population: Math.max(engagements, 1),
        period_start: formatDate(periodStart),
        period_end: formatDate(periodEnd),
      },
      {
        org_id: orgId,
        module: 'TAX_US_OVERLAY',
        metric: 'overlay_calculations',
        measured_value: overlayCount ?? 0,
        population: Math.max(engagements, 1),
        period_start: formatDate(periodStart),
        period_end: formatDate(periodEnd),
      },
    ];

    const { error: coverageError } = await client.from('telemetry_coverage_metrics').upsert(coverageRows, {
      onConflict: 'org_id,module,metric,period_start,period_end',
    });
    if (coverageError) throw new HttpError(500, coverageError.message);

    const targetHours = 720; // 30 days default target
    const status = openDisputes > 0 ? 'AT_RISK' : 'ON_TRACK';
    const slaRow = {
      org_id: orgId,
      module: 'TAX_TREATY_WHT',
      workflow_event: 'MAP_CASE_RESPONSE',
      target_hours: targetHours,
      breaches: openDisputes,
      open_breaches: openDisputes,
      status,
      computed_at: new Date().toISOString(),
    };

    const { error: slaError } = await client
      .from('telemetry_service_levels')
      .upsert(slaRow, { onConflict: 'org_id,module,workflow_event' });
    if (slaError) throw new HttpError(500, slaError.message);

    if (status === 'AT_RISK') {
      const context = {
        orgId,
        orgSlug,
        openBreaches: openDisputes,
        periodStart: formatDate(periodStart),
        periodEnd: formatDate(periodEnd),
      };
      await client
        .from('telemetry_alerts')
        .insert({
          org_id: orgId,
          alert_type: 'SLA_AT_RISK',
          severity: openDisputes > 3 ? 'CRITICAL' : 'WARNING',
          message: `MAP_CASE_RESPONSE SLA at risk (${openDisputes} open disputes)`,
          context,
        })
        .catch((error) => console.warn('telemetry_alert_insert_failed', error));

      if (telemetryAlertWebhook) {
        await fetch(telemetryAlertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ SLA at risk for ${orgSlug ?? orgId}: ${openDisputes} MAP/MAPA disputes remain open.`,
          }),
        }).catch((error) => console.warn('telemetry_alert_webhook_failed', error));
      }
    }

    const { data: cacheMetricsRow, error: cacheMetricsError } = await client
      .from('web_fetch_cache_metrics')
      .select('*')
      .maybeSingle();
    if (cacheMetricsError) throw new HttpError(500, 'web_cache_metrics_failed');

    const metricsPayload = {
      totalRows: cacheMetricsRow?.total_rows ?? 0,
      totalBytes: cacheMetricsRow?.total_bytes ?? 0,
      totalChars: cacheMetricsRow?.total_chars ?? 0,
      fetchedLast24h: cacheMetricsRow?.fetched_last_24h ?? 0,
      usedLast24h: cacheMetricsRow?.used_last_24h ?? 0,
      newestFetch: cacheMetricsRow?.newest_fetched_at ?? null,
      oldestFetch: cacheMetricsRow?.oldest_fetched_at ?? null,
      newestUse: cacheMetricsRow?.newest_last_used_at ?? null,
      oldestUse: cacheMetricsRow?.oldest_last_used_at ?? null,
    };

    let cacheStatus: 'EMPTY' | 'HEALTHY' | 'STALE' = 'EMPTY';
    if (metricsPayload.totalRows === 0) {
      cacheStatus = 'EMPTY';
    } else {
      cacheStatus = 'HEALTHY';
      const nowMs = Date.now();
      const newestFetchMs = metricsPayload.newestFetch ? Date.parse(metricsPayload.newestFetch) : Number.NaN;
      const oldestFetchMs = metricsPayload.oldestFetch ? Date.parse(metricsPayload.oldestFetch) : Number.NaN;
      const windowMs = WEB_CACHE_RETENTION_MS;
      if (Number.isFinite(oldestFetchMs)) {
        const referenceMs = Number.isFinite(newestFetchMs) ? Math.max(newestFetchMs, nowMs) : nowMs;
        if (referenceMs - oldestFetchMs > windowMs * 1.05) {
          cacheStatus = 'STALE';
        }
      }
    }

    if (cacheStatus === 'STALE') {
      const alertContext = {
        retentionDays: WEB_CACHE_RETENTION_DAYS,
        metrics: metricsPayload,
      };
      await client
        .from('telemetry_alerts')
        .insert({
          org_id: orgId,
          alert_type: 'WEB_CACHE_RETENTION',
          severity: 'WARNING',
          message: `web_fetch_cache oldest_fetched_at ${metricsPayload.oldestFetch ?? 'unknown'} exceeds ${WEB_CACHE_RETENTION_DAYS} day retention`,
          context: alertContext,
        })
        .catch((error) => console.warn('telemetry_alert_insert_failed', error));

      if (telemetryAlertWebhook) {
        await fetch(telemetryAlertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ web_fetch_cache retention exceeded for ${orgSlug ?? orgId ?? 'global'}. Oldest fetch ${metricsPayload.oldestFetch ?? 'unknown'}.`,
          }),
        }).catch((error) => console.warn('telemetry_alert_webhook_failed', error));
      }
    }

    return new Response(
      JSON.stringify({
        coverage: coverageRows,
        sla: slaRow,
        webCache: {
          retentionDays: WEB_CACHE_RETENTION_DAYS,
          status: cacheStatus,
          metrics: metricsPayload,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    if (error instanceof HttpError) {
      if (error.status >= 500) {
        await logEdgeError(client, {
          module: 'TELEMETRY_SYNC',
          message,
          orgId,
          orgSlug,
          context: methodContext,
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    console.error('telemetry-sync error', error);
    await logEdgeError(client, {
      module: 'TELEMETRY_SYNC',
      message,
      orgId,
      orgSlug,
      context: methodContext,
    });
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

serve(handler);
