import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { createControlSchema } from '@/lib/audit/schemas';
import { logAuditActivity } from '@/lib/audit/activity-log';
import { upsertAuditModuleRecord } from '@/lib/audit/module-records';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json({ error: 'orgId and engagementId are required query parameters.' }, { status: 400 });
  }

  const supabase = await getServiceSupabaseClient();

  const [{ data: controls, error: controlsError }, { data: itgcGroups, error: itgcError }, { data: deficiencies, error: defError }] =
    await Promise.all([
      supabase
        .from('controls')
        .select('*, control_walkthroughs(*), control_tests(*)')
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId)
        .order('cycle', { ascending: true }),
      supabase
        .from('itgc_groups')
        .select('*')
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId)
        .order('type', { ascending: true }),
      supabase
        .from('deficiencies')
        .select('*')
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false }),
    ]);

  if (controlsError || itgcError || defError) {
    const message = controlsError?.message ?? itgcError?.message ?? defError?.message ?? 'Unable to load control data';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ controls, itgcGroups, deficiencies });
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;

  try {
    payload = createControlSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, attachRequestId({ status: 400 }, requestId));
  }

  const { orgId, engagementId, userId, ...rest } = payload;

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `controls:create:${orgId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data, error } = await supabase
    .from('controls')
    .insert({
      org_id: orgId,
      engagement_id: engagementId,
      cycle: rest.cycle,
      objective: rest.objective,
      description: rest.description,
      frequency: rest.frequency,
      owner: rest.owner ?? null,
      key: rest.key ?? false,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Failed to create control.' }, { status: 500 });
  }

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId,
      engagementId,
      moduleCode: 'CTRL1',
      recordRef: data.id,
      title: data.description ?? data.objective ?? 'Control',
      metadata: {
        cycle: data.cycle,
        objective: data.objective,
        description: data.description,
        frequency: data.frequency,
        owner: data.owner,
        key: data.key,
      },
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: userId,
      ownerUserId: userId,
      userId,
    });
  } catch (moduleError) {
    await supabase
      .from('controls')
      .delete()
      .eq('id', data.id)
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId);

    const message = moduleError instanceof Error ? moduleError.message : 'Failed to sync audit module record.';
    return guard.json({ error: message }, { status: 500 });
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'CTRL_ADDED',
    entityId: data.id,
    metadata: {
      cycle: data.cycle,
      objective: data.objective,
      key: data.key,
      requestId,
    },
  });

  return guard.respond({ control: data });
}
