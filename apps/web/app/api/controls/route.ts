import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../lib/supabase-server';
import {
  createControlSchema,
} from '../../../lib/audit/schemas';
import { logAuditActivity } from '../../../lib/audit/activity-log';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json({ error: 'orgId and engagementId are required query parameters.' }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

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
  const supabase = getServiceSupabaseClient();
  let payload;

  try {
    payload = createControlSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { orgId, engagementId, userId, ...rest } = payload;

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
    return NextResponse.json({ error: error?.message ?? 'Failed to create control.' }, { status: 500 });
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
    },
  });

  return NextResponse.json({ control: data });
}
