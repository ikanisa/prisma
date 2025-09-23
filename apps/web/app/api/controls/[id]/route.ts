import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../lib/supabase-server';
import { updateControlSchema } from '../../../../lib/audit/schemas';
import { logAuditActivity } from '../../../../lib/audit/activity-log';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  const supabase = getServiceSupabaseClient();
  let payload;

  try {
    payload = updateControlSchema.parse({ ...(await request.json()), controlId: id });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { orgId, engagementId, userId, controlId, ...updates } = payload;

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.cycle) updatePayload.cycle = updates.cycle;
  if (updates.objective) updatePayload.objective = updates.objective;
  if (updates.description) updatePayload.description = updates.description;
  if (updates.frequency) updatePayload.frequency = updates.frequency;
  if (typeof updates.key === 'boolean') updatePayload.key = updates.key;
  if (updates.owner !== undefined) updatePayload.owner = updates.owner ?? null;

  const { data, error } = await supabase
    .from('controls')
    .update(updatePayload)
    .eq('id', controlId)
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Unable to update control.' }, { status: 500 });
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'CTRL_UPDATED',
    entityId: controlId,
    metadata: {
      cycle: data.cycle,
      objective: data.objective,
      key: data.key,
    },
  });

  return NextResponse.json({ control: data });
}
