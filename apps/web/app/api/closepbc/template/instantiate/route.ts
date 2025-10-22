import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { instantiatePbcSchema } from '@/lib/accounting/schemas';
import { logActivity } from '@/lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = instantiatePbcSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, attachRequestId({ status: 400 }, requestId));
  }

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource: `closepbc:instantiate:${payload.periodId}`,
    rateLimit: { limit: 10, windowSeconds: 300 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const templatePath = path.join(process.cwd(), 'CHECKLISTS', 'ACCOUNTING', 'close_pbc_template.yaml');
  const file = await fs.readFile(templatePath, 'utf8');
  const template = YAML.parse(file) as {
    templates: Record<string, Array<{ area: string; title: string; dueDays?: number }>>;
  };

  const entries = template.templates?.[payload.templateKey] ?? template.templates?.default ?? [];
  if (!entries || entries.length === 0) {
    return guard.json({ error: 'Template not found or empty' }, { status: 404 });
  }

  const dueBase = Date.now();
  const rows = entries.map((entry) => ({
    org_id: payload.orgId,
    entity_id: payload.entityId,
    period_id: payload.periodId,
    area: entry.area,
    title: entry.title,
    assignee_user_id: null,
    due_at: entry.dueDays ? new Date(dueBase + entry.dueDays * 86400000).toISOString() : null,
    status: 'REQUESTED',
    note: null,
    document_id: null,
  }));

  const { error } = await supabase.from('close_pbc_items').insert(rows);
  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'PBC_INSTANTIATED',
    entityType: 'CLOSE_PBC',
    entityId: payload.periodId,
    metadata: { template: payload.templateKey, count: rows.length, requestId },
  });

  return guard.respond({ inserted: rows.length });
}
