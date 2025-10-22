import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { env } from '@/src/env.server';

const TOKEN_PRICE_PER_K: Record<string, number> = {
  'text-embedding-3-small': 0.00002,
  'text-embedding-3-large': 0.00013,
  'text-embedding-ada-002': 0.0001,
};

const triggerSchema = z.object({
  orgId: z.string().uuid('orgId must be a UUID'),
  lookbackHours: z.coerce.number().int().positive().max(24 * 365).optional(),
  documentLimit: z.coerce.number().int().positive().max(500).optional(),
  policyLimit: z.coerce.number().int().positive().max(500).optional(),
});

type RoleLevel = 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';

function normaliseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  const windowParam = url.searchParams.get('windowHours');
  const windowHours = windowParam ? Math.max(1, Math.min(24 * 365, Number(windowParam) || 0)) : 24;

  if (!orgId) {
    return NextResponse.json({ error: 'orgId query parameter is required.' }, { status: 400 });
  }

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const supabase = await getServiceSupabaseClient();
  const { data, error } = await supabase
    .from('autonomy_telemetry_events')
    .select('scenario, decision, metrics, occurred_at')
    .eq('module', 'knowledge_embeddings')
    .eq('org_id', orgId)
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'telemetry_query_failed' }, { status: 500 });
  }

  const events = data ?? [];

  const totals = {
    events: events.length,
    approved: 0,
    review: 0,
    refused: 0,
    tokens: 0,
    promptTokens: 0,
    estimatedCost: 0,
  };

  const scenarioMap = new Map<
    string,
    {
      scenario: string;
      events: number;
      approved: number;
      review: number;
      refused: number;
      tokens: number;
      promptTokens: number;
      estimatedCost: number;
    }
  >();

  type FailureRecord = {
    scenario: string;
    decision: string;
    reason: string | null;
    occurredAt: string | null;
    metrics: Record<string, unknown>;
  };

  const failures: FailureRecord[] = [];
  const staleSignals: FailureRecord[] = [];

  for (const event of events) {
    const metrics = (event.metrics ?? {}) as Record<string, unknown>;
    const tokens = normaliseNumber(metrics.tokens ?? metrics.total_tokens);
    const promptTokens = normaliseNumber(metrics.promptTokens ?? metrics.prompt_tokens);
    const model = typeof metrics.model === 'string' ? metrics.model : 'text-embedding-3-small';
    const pricePerThousand = TOKEN_PRICE_PER_K[model] ?? TOKEN_PRICE_PER_K['text-embedding-3-small'];
    const estimatedCost = tokens ? (tokens / 1000) * pricePerThousand : 0;

    totals.tokens += tokens;
    totals.promptTokens += promptTokens;
    totals.estimatedCost += estimatedCost;

    if (event.decision === 'APPROVED') {
      totals.approved += 1;
    } else if (event.decision === 'REVIEW') {
      totals.review += 1;
    } else if (event.decision === 'REFUSED') {
      totals.refused += 1;
    }

    const existing = scenarioMap.get(event.scenario) ?? {
      scenario: event.scenario,
      events: 0,
      approved: 0,
      review: 0,
      refused: 0,
      tokens: 0,
      promptTokens: 0,
      estimatedCost: 0,
    };

    existing.events += 1;
    existing.tokens += tokens;
    existing.promptTokens += promptTokens;
    existing.estimatedCost += estimatedCost;

    if (event.decision === 'APPROVED') existing.approved += 1;
    if (event.decision === 'REVIEW') existing.review += 1;
    if (event.decision === 'REFUSED') existing.refused += 1;

    scenarioMap.set(event.scenario, existing);

    if (event.decision !== 'APPROVED') {
      const reason = typeof metrics.reason === 'string' ? metrics.reason : null;
      const record: FailureRecord = {
        scenario: event.scenario,
        decision: event.decision,
        reason,
        occurredAt: event.occurred_at,
        metrics,
      };
      if (event.decision === 'REFUSED') {
        failures.push(record);
      } else {
        staleSignals.push(record);
      }
    }
  }

  const scenarioSummaries = Array.from(scenarioMap.values()).map((entry) => ({
    ...entry,
    failureRate: entry.events ? entry.refused / entry.events : 0,
    reviewRate: entry.events ? entry.review / entry.events : 0,
    estimatedCost: Number(entry.estimatedCost.toFixed(6)),
  }));

  return NextResponse.json({
    windowHours,
    totals: {
      ...totals,
      estimatedCost: Number(totals.estimatedCost.toFixed(6)),
    },
    scenarios: scenarioSummaries,
    recentFailures: failures.slice(0, 10),
    staleCorpora: staleSignals.slice(0, 10),
  });
}

export async function POST(request: Request) {
  if (!env.EMBEDDING_CRON_SECRET) {
    return NextResponse.json({ error: 'embedding_cron_secret_missing' }, { status: 503 });
  }

  const ragServiceUrl = env.RAG_SERVICE_URL ?? env.AGENT_SERVICE_URL;
  if (!ragServiceUrl) {
    return NextResponse.json({ error: 'rag_service_unconfigured' }, { status: 503 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = triggerSchema.safeParse(rawPayload ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.format() }, { status: 400 });
  }

  const payload = parsed.data;

  const session = await auth();
  const userId =
    (session?.user as { id?: string } | undefined)?.id ??
    (session?.user as { sub?: string } | undefined)?.sub ??
    null;

  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const supabase = await getServiceSupabaseClient();

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', payload.orgId)
    .eq('user_id', userId)
    .maybeSingle<{ role: RoleLevel }>();

  if (membershipError) {
    return NextResponse.json({ error: 'membership_lookup_failed' }, { status: 500 });
  }

  let hasAccess = false;
  if (membership) {
    hasAccess = membership.role === 'MANAGER' || membership.role === 'SYSTEM_ADMIN';
  }

  if (!hasAccess) {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('is_system_admin')
      .eq('id', userId)
      .maybeSingle<{ is_system_admin: boolean }>();

    if (userError) {
      return NextResponse.json({ error: 'privilege_lookup_failed' }, { status: 500 });
    }

    if (!userRow?.is_system_admin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    hasAccess = true;
  }

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', payload.orgId)
    .maybeSingle<{ slug: string }>();

  if (orgError) {
    return NextResponse.json({ error: 'organization_lookup_failed' }, { status: 500 });
  }

  if (!organization) {
    return NextResponse.json({ error: 'organization_not_found' }, { status: 404 });
  }

  const actorIdentifier = session?.user?.email ?? session?.user?.name ?? userId;
  const requestBody: Record<string, unknown> = {
    actor: `dashboard:${actorIdentifier}`,
    orgIds: [payload.orgId],
  };

  if (payload.lookbackHours) {
    requestBody.lookbackHours = payload.lookbackHours;
  }
  if (payload.documentLimit) {
    requestBody.documentLimit = payload.documentLimit;
  }
  if (payload.policyLimit) {
    requestBody.policyLimit = payload.policyLimit;
  }

  try {
    const endpoint = new URL('/internal/knowledge/embeddings/reembed-delta', ragServiceUrl);
    const response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-embedding-cron-secret': env.EMBEDDING_CRON_SECRET,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let parsedBody: unknown = null;
    try {
      parsedBody = text ? JSON.parse(text) : null;
    } catch {
      parsedBody = null;
    }

    const bodyJson =
      typeof parsedBody === 'object' && parsedBody !== null
        ? (parsedBody as Record<string, unknown>)
        : {};

    if (!response.ok) {
      const error = typeof bodyJson.error === 'string' ? bodyJson.error : 'delta_job_failed';
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json({ ...bodyJson, orgSlug: organization.slug });
  } catch (error) {
    return NextResponse.json(
      { error: 'delta_job_request_failed', message: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
