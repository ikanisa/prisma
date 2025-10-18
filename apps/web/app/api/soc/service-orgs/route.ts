import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { upsertAuditModuleRecord } from '@/lib/audit/module-records';
import { logAuditActivity } from '@/lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

const TABLE = 'service_organisations' as const;

type ServiceOrganisationRow = {
  id: string;
  org_id: string;
  engagement_id: string;
  name: string;
  service_type: string | null;
  residual_risk: string | null;
  reliance_assessed: boolean | null;
  control_owner?: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

// Schema from `main`, extended with optional fields from `codex/*`
const createSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  serviceType: z.string().optional(),
  relianceAssessed: z.boolean().optional(),
  residualRisk: z.string().optional(),
  // extras from codex/*
  controlOwner: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  systemScope: z.string().optional(),
  oversightNotes: z.string().optional(),
  // auditing
  userId: z.string().uuid(),
});

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json(
      { error: 'orgId and engagementId query parameters are required.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  const supabase = await getServiceSupabaseClient();

  // AuthZ + basic DoS protection
  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `soc:service-org:list:${engagementId}`,
    rateLimit: { limit: 120, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
        *,
        reports:soc_reports(*),
        cuecs:cuec_controls(*)
      `,
    )
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });

  if (error) {
    return guard.json(
      { error: error.message ?? 'Failed to load service organisations.' },
      { status: 500 },
    );
  }

  return guard.respond({ serviceOrgs: data ?? [] });
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();

  // Parse + validate
  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.flatten() },
        attachRequestId({ status: 400 }, requestId),
      );
    }
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  // AuthZ + replay/rate limits
  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource: `soc:service-org:create:${payload.engagementId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  // Create service organisation (extras are nullable; DB may not have all columns)
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      org_id: payload.orgId,
      engagement_id: payload.engagementId,
      name: payload.name,
      description: payload.description ?? null,
      service_type: payload.serviceType ?? null,
      residual_risk: payload.residualRisk ?? null,
      reliance_assessed: payload.relianceAssessed ?? false,
      // optional codex fields (safe to include; ignored if cols absent via PostgREST?)
      control_owner: payload.controlOwner ?? null,
      contact_email: payload.contactEmail ?? null,
      contact_phone: payload.contactPhone ?? null,
      system_scope: payload.systemScope ?? null,
      oversight_notes: payload.oversightNotes ?? null,
      created_by: payload.userId,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json(
      { error: error?.message ?? 'Failed to create service organisation.' },
      { status: 500 },
    );
  }
  const serviceOrg = data as ServiceOrganisationRow;

  // Register in audit module records (as in main)
  try {
    await upsertAuditModuleRecord(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'SOC1',
      recordRef: serviceOrg.id,
      title: `${serviceOrg.name} service org`,
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: payload.userId,
      metadata: {
        serviceType: serviceOrg.service_type ?? null,
        residualRisk: serviceOrg.residual_risk ?? null,
        contactEmail: serviceOrg.contact_email ?? null,
        contactPhone: serviceOrg.contact_phone ?? null,
      },
      userId: payload.userId,
    });
  } catch (moduleError) {
    return guard.json(
      {
        error:
          moduleError instanceof Error
            ? moduleError.message
            : 'Failed to register service organisation in audit module records.',
      },
      { status: 500 },
    );
  }

  // Activity log (as in main)
  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'SOC_CREATED',
    entityType: 'AUDIT_SOC',
    entityId: serviceOrg.id,
    metadata: {
      serviceType: serviceOrg.service_type,
      residualRisk: serviceOrg.residual_risk,
      relianceAssessed: serviceOrg.reliance_assessed ?? false,
      requestId,
    },
  });

  return guard.respond({ serviceOrg });
}
