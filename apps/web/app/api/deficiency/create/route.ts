import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../lib/supabase-server';
import { createDeficiencySchema } from '../../../../lib/audit/schemas';
import { logAuditActivity } from '../../../../lib/audit/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;

  try {
    payload = createDeficiencySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { orgId, engagementId, userId, controlId, recommendation, severity, status } = payload;

  const { data, error } = await supabase
    .from('deficiencies')
    .insert({
      org_id: orgId,
      engagement_id: engagementId,
      control_id: controlId ?? null,
      recommendation,
      severity,
      status,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create deficiency.' }, { status: 500 });
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'CTRL_DEFICIENCY_RAISED',
    entityId: controlId ?? data.id,
    metadata: {
      deficiencyId: data.id,
      severity: data.severity,
      status: data.status,
    },
  });

  return NextResponse.json({ deficiency: data });
}
