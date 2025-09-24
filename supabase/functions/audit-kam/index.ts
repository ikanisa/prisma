import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { ensureAcceptanceApproved } from '../_shared/acceptance.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type CandidateSource = Database['public']['Enums']['kam_candidate_source'];
type CandidateStatus = Database['public']['Enums']['kam_candidate_status'];
type DraftStatus = Database['public']['Enums']['kam_draft_status'];
type ApprovalStage = Database['public']['Enums']['approval_stage'];

type SupabaseUser = {
  id: string;
  email?: string;
};

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

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function createSupabaseClient(authHeader: string): TypedClient {
  return createClient<Database>(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

async function getUser(client: TypedClient): Promise<SupabaseUser> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, 'invalid_token');
  }
  return { id: data.user.id, email: data.user.email ?? undefined };
}

async function getOrgContext(
  client: TypedClient,
  orgSlug: string | null,
  userId: string,
) {
  if (!orgSlug) {
    throw new HttpError(400, 'org_slug_required');
  }

  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('id, slug')
    .eq('slug', orgSlug)
    .maybeSingle();

  if (orgError) throw new HttpError(500, 'org_lookup_failed');
  if (!org) throw new HttpError(404, 'organization_not_found');

  const { data: membership, error: membershipError } = await client
    .from('memberships')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) throw new HttpError(500, 'membership_lookup_failed');
  if (!membership) throw new HttpError(403, 'not_a_member');

  return { orgId: org.id, role: membership.role as RoleLevel };
}

function requireRole(current: RoleLevel, min: RoleLevel) {
  if (roleRank[current] < roleRank[min]) {
    throw new HttpError(403, 'insufficient_role');
  }
}

async function fetchEngagement(
  client: TypedClient,
  orgId: string,
  engagementId: string | null,
) {
  if (!engagementId) {
    throw new HttpError(400, 'engagement_id_required');
  }
  const { data, error } = await client
    .from('engagements')
    .select('id, org_id, eqr_required')
    .eq('id', engagementId)
    .maybeSingle();

  if (error) throw new HttpError(500, 'engagement_lookup_failed');
  if (!data || data.org_id !== orgId) {
    throw new HttpError(404, 'engagement_not_found');
  }

  return data;
}

async function assertAcceptance(client: TypedClient, orgId: string, engagementId: string) {
  try {
    await ensureAcceptanceApproved(client, orgId, engagementId);
  } catch {
    throw new HttpError(403, 'acceptance_not_approved');
  }
}

async function logActivity(
  client: TypedClient,
  params: {
    orgId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) {
    console.error('activity_log_error', error);
  }
}

async function ensureRisk(
  client: TypedClient,
  orgId: string,
  engagementId: string,
  riskId: string,
) {
  const { data, error } = await client
    .from('risks')
    .select('id, description, area, is_significant, is_fraud_risk')
    .eq('id', riskId)
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'risk_lookup_failed');
  if (!data) throw new HttpError(404, 'risk_not_found');
  return data;
}

async function ensureEstimate(
  client: TypedClient,
  orgId: string,
  engagementId: string,
  estimateId: string,
) {
  const { data, error } = await client
    .from('estimate_register')
    .select('id, caption, uncertainty_level')
    .eq('id', estimateId)
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'estimate_lookup_failed');
  if (!data) throw new HttpError(404, 'estimate_not_found');
  return data;
}

async function ensureGoingConcern(
  client: TypedClient,
  orgId: string,
  engagementId: string,
  worksheetId: string,
) {
  const { data, error } = await client
    .from('going_concern_worksheets')
    .select('id, assessment, conclusion')
    .eq('id', worksheetId)
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'going_concern_lookup_failed');
  if (!data) throw new HttpError(404, 'going_concern_not_found');
  return data;
}

async function ensureProceduresExist(
  client: TypedClient,
  orgId: string,
  engagementId: string,
  refs: Array<{ procedureId?: string; isaRefs?: string[] }> | null,
) {
  if (!refs || refs.length === 0) {
    throw new HttpError(400, 'procedures_required');
  }

  const ids = Array.from(
    new Set(
      refs
        .map((ref) => ref.procedureId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (ids.length === 0) {
    throw new HttpError(400, 'procedure_ids_missing');
  }

  const { data, error } = await client
    .from('audit_planned_procedures')
    .select('id')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .in('id', ids);

  if (error) throw new HttpError(500, 'procedure_lookup_failed');
  if (!data || data.length !== ids.length) {
    throw new HttpError(400, 'procedure_not_found');
  }

  for (const ref of refs) {
    if (!ref.procedureId) {
      throw new HttpError(400, 'procedure_id_required');
    }
    if (!Array.isArray(ref.isaRefs) || ref.isaRefs.length === 0) {
      throw new HttpError(400, 'isa_references_required');
    }
  }
}

async function ensureEvidenceExists(
  client: TypedClient,
  orgId: string,
  engagementId: string,
  refs: Array<{ evidenceId?: string; documentId?: string }> | null,
) {
  if (!refs || refs.length === 0) {
    throw new HttpError(400, 'evidence_required');
  }

  const evidenceIds = Array.from(
    new Set(refs.map((ref) => ref.evidenceId).filter((id): id is string => Boolean(id))),
  );

  const documentIds = Array.from(
    new Set(refs.map((ref) => ref.documentId).filter((id): id is string => Boolean(id))),
  );

  if (evidenceIds.length === 0 && documentIds.length === 0) {
    throw new HttpError(400, 'evidence_or_documents_required');
  }

  if (evidenceIds.length > 0) {
    const { data, error } = await client
      .from('audit_evidence')
      .select('id')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .in('id', evidenceIds);
    if (error) throw new HttpError(500, 'evidence_lookup_failed');
    if (!data || data.length !== evidenceIds.length) {
      throw new HttpError(400, 'evidence_not_found');
    }
  }

  if (documentIds.length > 0) {
    const { data, error } = await client
      .from('documents')
      .select('id')
      .eq('org_id', orgId)
      .in('id', documentIds);
    if (error) throw new HttpError(500, 'document_lookup_failed');
    if (!data || data.length !== documentIds.length) {
      throw new HttpError(400, 'document_not_found');
    }
  }
}

async function autoSeedCandidates(
  client: TypedClient,
  params: { orgId: string; engagementId: string; userId: string },
) {
  // Significant or fraud risks
  const { data: risks } = await client
    .from('risks')
    .select('id, description, area, is_significant, is_fraud_risk')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .or('is_significant.eq.true,is_fraud_risk.eq.true');

  if (risks && risks.length > 0) {
    for (const risk of risks) {
      const { data: existing } = await client
        .from('kam_candidates')
        .select('id')
        .eq('engagement_id', params.engagementId)
        .eq('risk_id', risk.id)
        .maybeSingle();

      if (!existing) {
        const title = risk.area ?? 'Significant Risk';
        const rationaleParts = [] as string[];
        if (risk.is_significant) rationaleParts.push('Marked significant risk');
        if (risk.is_fraud_risk) rationaleParts.push('Fraud risk indicator');
        if (risk.description) rationaleParts.push(risk.description);

        const { data: inserted, error: insertError } = await client
          .from('kam_candidates')
          .insert({
            org_id: params.orgId,
            engagement_id: params.engagementId,
            source: 'RISK' as CandidateSource,
            risk_id: risk.id,
            title,
            rationale: rationaleParts.join(' - ') || null,
            created_by_user_id: params.userId,
            updated_by_user_id: params.userId,
          })
          .select('id')
          .maybeSingle();

        if (insertError) {
          console.error('auto_seed_risk_failed', insertError);
        } else if (inserted) {
          await logActivity(client, {
            orgId: params.orgId,
            userId: params.userId,
            action: 'KAM_CANDIDATE_ADDED',
            entityType: 'KAM_CANDIDATE',
            entityId: inserted.id,
            metadata: { source: 'RISK_AUTO', riskId: risk.id },
          });
        }
      }
    }
  }

  const { data: estimates } = await client
    .from('estimate_register')
    .select('id, caption, uncertainty_level')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .in('uncertainty_level', ['HIGH', 'SIGNIFICANT']);

  if (estimates && estimates.length > 0) {
    for (const estimate of estimates) {
      const { data: existing } = await client
        .from('kam_candidates')
        .select('id')
        .eq('engagement_id', params.engagementId)
        .eq('estimate_id', estimate.id)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error: insertError } = await client
          .from('kam_candidates')
          .insert({
            org_id: params.orgId,
            engagement_id: params.engagementId,
            source: 'ESTIMATE' as CandidateSource,
            estimate_id: estimate.id,
            title: estimate.caption,
            rationale: `Estimate flagged with ${estimate.uncertainty_level} uncertainty`,
            created_by_user_id: params.userId,
            updated_by_user_id: params.userId,
          })
          .select('id')
          .maybeSingle();

        if (insertError) {
          console.error('auto_seed_estimate_failed', insertError);
        } else if (inserted) {
          await logActivity(client, {
            orgId: params.orgId,
            userId: params.userId,
            action: 'KAM_CANDIDATE_ADDED',
            entityType: 'KAM_CANDIDATE',
            entityId: inserted.id,
            metadata: { source: 'ESTIMATE_AUTO', estimateId: estimate.id },
          });
        }
      }
    }
  }

  const { data: gcWorksheets } = await client
    .from('going_concern_worksheets')
    .select('id, conclusion')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .eq('assessment', 'MATERIAL_UNCERTAINTY');

  if (gcWorksheets && gcWorksheets.length > 0) {
    for (const sheet of gcWorksheets) {
      const { data: existing } = await client
        .from('kam_candidates')
        .select('id')
        .eq('engagement_id', params.engagementId)
        .eq('going_concern_id', sheet.id)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error: insertError } = await client
          .from('kam_candidates')
          .insert({
            org_id: params.orgId,
            engagement_id: params.engagementId,
            source: 'GOING_CONCERN' as CandidateSource,
            going_concern_id: sheet.id,
            title: 'Going concern material uncertainty',
            rationale: sheet.conclusion ?? 'Material uncertainty related to going concern',
            created_by_user_id: params.userId,
            updated_by_user_id: params.userId,
          })
          .select('id')
          .maybeSingle();

        if (insertError) {
          console.error('auto_seed_gc_failed', insertError);
        } else if (inserted) {
          await logActivity(client, {
            orgId: params.orgId,
            userId: params.userId,
            action: 'KAM_CANDIDATE_ADDED',
            entityType: 'KAM_CANDIDATE',
            entityId: inserted.id,
            metadata: { source: 'GOING_CONCERN_AUTO', goingConcernId: sheet.id },
          });
        }
      }
    }
  }
}

async function ensureApprovalStages(
  client: TypedClient,
  params: {
    orgId: string;
    engagementId: string;
    candidateId: string;
    draftId: string;
    createdBy: string;
    eqrRequired: boolean | null;
  },
) {
  const requiredStages: ApprovalStage[] = ['MANAGER', 'PARTNER'];
  if (params.eqrRequired) {
    requiredStages.push('EQR');
  }

  const { data: existing, error } = await client
    .from('approval_queue')
    .select('id, stage')
    .eq('org_id', params.orgId)
    .eq('draft_id', params.draftId)
    .eq('kind', 'KAM_DRAFT');

  if (error) throw new HttpError(500, 'approval_lookup_failed');

  const haveStage = new Set(existing?.map((row) => row.stage));
  for (const stage of requiredStages) {
    if (!haveStage.has(stage)) {
      const { error: insertError } = await client.from('approval_queue').insert({
        org_id: params.orgId,
        engagement_id: params.engagementId,
        kind: 'KAM_DRAFT',
        stage,
        candidate_id: params.candidateId,
        draft_id: params.draftId,
        created_by_user_id: params.createdBy,
        updated_by_user_id: params.createdBy,
        payload: {
          draftId: params.draftId,
          candidateId: params.candidateId,
          stage,
        },
      });
      if (insertError) throw new HttpError(500, 'approval_queue_create_failed');
    }
  }
}

async function loadApprovals(
  client: TypedClient,
  params: { orgId: string; draftId: string },
) {
  const { data, error } = await client
    .from('approval_queue')
    .select('id, stage, status, resolved_at, resolved_by_user_id')
    .eq('org_id', params.orgId)
    .eq('draft_id', params.draftId)
    .eq('kind', 'KAM_DRAFT');
  if (error) throw new HttpError(500, 'approval_lookup_failed');
  return data ?? [];
}

async function finalizeDraftStatus(
  client: TypedClient,
  params: {
    orgId: string;
    engagementId: string;
    draft: Database['public']['Tables']['kam_drafts']['Row'];
    userId: string;
  },
) {
  const approvals = await loadApprovals(client, { orgId: params.orgId, draftId: params.draft.id });
  const anyRejected = approvals.some((item) => item.status === 'REJECTED');
  const allApproved = approvals.length > 0 && approvals.every((item) => item.status === 'APPROVED');

  if (anyRejected) {
    const { error } = await client
      .from('kam_drafts')
      .update({
        status: 'REJECTED' as DraftStatus,
        updated_by_user_id: params.userId,
        approved_by_user_id: null,
        approved_at: null,
        eqr_approved_by_user_id: null,
        eqr_approved_at: null,
      })
      .eq('id', params.draft.id);
    if (error) throw new HttpError(500, 'draft_reject_update_failed');

    await logActivity(client, {
      orgId: params.orgId,
      userId: params.userId,
      action: 'KAM_DRAFT_REJECTED',
      entityType: 'KAM_DRAFT',
      entityId: params.draft.id,
    });
    return;
  }

  if (allApproved) {
    const partnerApproval = approvals.find((item) => item.stage === 'PARTNER');
    const eqrApproval = approvals.find((item) => item.stage === 'EQR');

    const payload: Database['public']['Tables']['kam_drafts']['Update'] = {
      status: 'APPROVED' as DraftStatus,
      updated_by_user_id: params.userId,
      approved_by_user_id: partnerApproval?.resolved_by_user_id ?? params.userId,
      approved_at: partnerApproval?.resolved_at ?? new Date().toISOString(),
    };

    if (eqrApproval) {
      payload.eqr_approved_by_user_id = eqrApproval.resolved_by_user_id ?? params.userId;
      payload.eqr_approved_at = eqrApproval.resolved_at ?? new Date().toISOString();
    }

    const { error } = await client
      .from('kam_drafts')
      .update(payload)
      .eq('id', params.draft.id);
    if (error) throw new HttpError(500, 'draft_approve_update_failed');

    await logActivity(client, {
      orgId: params.orgId,
      userId: params.userId,
      action: eqrApproval ? 'KAM_DRAFT_EQR_APPROVED' : 'KAM_DRAFT_APPROVED',
      entityType: 'KAM_DRAFT',
      entityId: params.draft.id,
      metadata: {
        partnerApproval: partnerApproval?.id,
        eqrApproval: eqrApproval?.id,
      },
    });
  }
}

function draftToMarkdown(draft: any) {
  const lines: string[] = [];
  lines.push(`### ${draft.heading}`);
  lines.push('');
  lines.push('**Why it was a KAM**');
  lines.push(draft.why_kam ?? '');
  lines.push('');
  lines.push('**How we addressed the matter**');
  lines.push(draft.how_addressed ?? '');
  lines.push('');
  lines.push('**Results**');
  lines.push(draft.results_summary ?? '');
  lines.push('');
  lines.push('**Procedures**');
  const procedures = Array.isArray(draft.procedures_refs)
    ? draft.procedures_refs
    : [];
  if (procedures.length === 0) {
    lines.push('- (Pending selection)');
  } else {
    for (const item of procedures) {
      const isaRefs = Array.isArray(item?.isaRefs) ? ` (ISA: ${item.isaRefs.join(', ')})` : '';
      lines.push(`- Procedure ${item?.procedureId ?? ''}${isaRefs}`);
    }
  }
  lines.push('');
  lines.push('**Evidence**');
  const evidence = Array.isArray(draft.evidence_refs)
    ? draft.evidence_refs
    : [];
  if (evidence.length === 0) {
    lines.push('- (Pending selection)');
  } else {
    for (const item of evidence) {
      const parts: string[] = [];
      if (item?.evidenceId) parts.push(`Evidence ${item.evidenceId}`);
      if (item?.documentId) parts.push(`Document ${item.documentId}`);
      if (item?.note) parts.push(item.note);
      lines.push(`- ${parts.join(' — ')}`);
    }
  }
  return lines.join('\n');
}

async function handleExport(
  client: TypedClient,
  user: SupabaseUser,
  url: URL,
) {
  const orgSlug = url.searchParams.get('orgSlug');
  const engagementId = url.searchParams.get('engagementId');
  const format = url.searchParams.get('format') ?? 'json';

  const { orgId } = await getOrgContext(client, orgSlug, user.id);
  const engagement = await fetchEngagement(client, orgId, engagementId);
  await assertAcceptance(client, orgId, engagement.id);

  const { data, error } = await client
    .from('kam_drafts')
    .select('id, heading, why_kam, how_addressed, results_summary, procedures_refs, evidence_refs, status, candidate:kam_candidates(title, source)')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('status', 'APPROVED');

  if (error) throw new HttpError(500, 'export_fetch_failed');

  const drafts = (data ?? []).map((draft) => ({
    id: draft.id,
    heading: draft.heading,
    whyKAM: draft.why_kam,
    howAddressed: draft.how_addressed,
    resultsSummary: draft.results_summary,
    procedures: draft.procedures_refs,
    evidence: draft.evidence_refs,
    candidate: draft.candidate,
  }));

  if (format === 'markdown') {
    const markdown = drafts.map((draft) => draftToMarkdown({
      heading: draft.heading,
      why_kam: draft.whyKAM,
      how_addressed: draft.howAddressed,
      results_summary: draft.resultsSummary,
      procedures_refs: draft.procedures,
      evidence_refs: draft.evidence,
    })).join('\n\n');
    return jsonResponse(200, { markdown, count: drafts.length });
  }

  return jsonResponse(200, { drafts, count: drafts.length });
}

async function handleList(
  client: TypedClient,
  user: SupabaseUser,
  url: URL,
) {
  const orgSlug = url.searchParams.get('orgSlug');
  const engagementId = url.searchParams.get('engagementId');
  const seed = url.searchParams.get('seed');

  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  const engagement = await fetchEngagement(client, orgId, engagementId);

  await assertAcceptance(client, orgId, engagement.id);

  if (seed !== 'false') {
    await autoSeedCandidates(client, {
      orgId,
      engagementId: engagement.id,
      userId: user.id,
    });
  }

  const { data: candidates, error: candidatesError } = await client
    .from('kam_candidates')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .order('created_at', { ascending: true });

  if (candidatesError) throw new HttpError(500, 'candidates_fetch_failed');

  const { data: drafts, error: draftsError } = await client
    .from('kam_drafts')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .order('created_at', { ascending: true });

  if (draftsError) throw new HttpError(500, 'drafts_fetch_failed');

  const { data: approvals, error: approvalsError } = await client
    .from('approval_queue')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .order('created_at', { ascending: true });

  if (approvalsError) throw new HttpError(500, 'approvals_fetch_failed');

  return jsonResponse(200, {
    candidates: candidates ?? [],
    drafts: drafts ?? [],
    approvals: approvals ?? [],
    role,
  });
}

async function handleCandidateAdd(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  requireRole(role, 'EMPLOYEE');

  await assertAcceptance(client, orgId, engagement.id);

  const source = body.source as CandidateSource;
  if (!source) throw new HttpError(400, 'source_required');

  const payload: Database['public']['Tables']['kam_candidates']['Insert'] = {
    org_id: orgId,
    engagement_id: body.engagementId,
    source,
    title: body.title,
    rationale: body.rationale ?? null,
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
  };

  if (!payload.title) throw new HttpError(400, 'title_required');

  if (source === 'RISK') {
    if (!body.riskId) throw new HttpError(400, 'risk_id_required');
    await ensureRisk(client, orgId, body.engagementId, body.riskId);
    payload.risk_id = body.riskId;
  } else if (source === 'ESTIMATE') {
    if (!body.estimateId) throw new HttpError(400, 'estimate_id_required');
    await ensureEstimate(client, orgId, body.engagementId, body.estimateId);
    payload.estimate_id = body.estimateId;
  } else if (source === 'GOING_CONCERN') {
    if (!body.goingConcernId) throw new HttpError(400, 'going_concern_id_required');
    await ensureGoingConcern(client, orgId, body.engagementId, body.goingConcernId);
    payload.going_concern_id = body.goingConcernId;
  } else {
    if (body.riskId || body.estimateId || body.goingConcernId) {
      throw new HttpError(400, 'other_source_cannot_reference_ids');
    }
  }

  const { data, error } = await client
    .from('kam_candidates')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'candidate_exists');
    }
    throw new HttpError(500, 'candidate_create_failed');
  }

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'KAM_CANDIDATE_ADDED',
    entityType: 'KAM_CANDIDATE',
    entityId: data.id,
    metadata: { source },
  });

  return jsonResponse(201, { candidate: data });
}

async function handleCandidateStatus(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  status: CandidateStatus,
) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);
  requireRole(role, 'MANAGER');

  if (!body.candidateId) throw new HttpError(400, 'candidate_id_required');

  const updates: Partial<Database['public']['Tables']['kam_candidates']['Update']> = {
    status,
    updated_by_user_id: user.id,
  };

  if (status === 'EXCLUDED') {
    updates.rationale = body.reason ?? null;
  }

  const { data, error } = await client
    .from('kam_candidates')
    .update(updates)
    .eq('id', body.candidateId)
    .eq('org_id', orgId)
    .select('*')
    .maybeSingle();

  if (error) throw new HttpError(500, 'candidate_update_failed');
  if (!data) throw new HttpError(404, 'candidate_not_found');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: status === 'SELECTED' ? 'KAM_CANDIDATE_SELECTED' : 'KAM_CANDIDATE_EXCLUDED',
    entityType: 'KAM_CANDIDATE',
    entityId: data.id,
    metadata: status === 'EXCLUDED' ? { reason: body.reason ?? null } : undefined,
  });

  return jsonResponse(200, { candidate: data });
}

async function handleDraftCreate(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  requireRole(role, 'EMPLOYEE');

  await assertAcceptance(client, orgId, engagement.id);

  if (!body.candidateId) throw new HttpError(400, 'candidate_id_required');

  const { data: candidate, error: candidateError } = await client
    .from('kam_candidates')
    .select('*')
    .eq('id', body.candidateId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (candidateError) throw new HttpError(500, 'candidate_lookup_failed');
  if (!candidate) throw new HttpError(404, 'candidate_not_found');
  if (candidate.engagement_id !== body.engagementId) {
    throw new HttpError(400, 'candidate_engagement_mismatch');
  }

  const { data: existing } = await client
    .from('kam_drafts')
    .select('*')
    .eq('candidate_id', candidate.id)
    .maybeSingle();

  if (existing) {
    return jsonResponse(200, { draft: existing, reused: true });
  }

  const payload: Database['public']['Tables']['kam_drafts']['Insert'] = {
    org_id: orgId,
    engagement_id: candidate.engagement_id,
    candidate_id: candidate.id,
    heading: body.heading ?? candidate.title,
    why_kam: body.whyKam ?? candidate.rationale ?? null,
    how_addressed: body.howAddressed ?? null,
    results_summary: body.resultsSummary ?? null,
    procedures_refs: body.proceduresRefs ?? [],
    evidence_refs: body.evidenceRefs ?? [],
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
  };

  if (!payload.heading) throw new HttpError(400, 'heading_required');

  const { data, error } = await client
    .from('kam_drafts')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new HttpError(500, 'draft_create_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'KAM_DRAFT_CREATED',
    entityType: 'KAM_DRAFT',
    entityId: data.id,
    metadata: { candidateId: candidate.id },
  });

  return jsonResponse(201, { draft: data });
}

async function handleDraftUpdate(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  await fetchEngagement(client, orgId, body.engagementId ?? null);
  requireRole(role, 'EMPLOYEE');

  try {
    await ensureAcceptanceApproved(client, orgId, body.engagementId ?? '');
  } catch {
    throw new HttpError(403, 'acceptance_not_approved');
  }

  if (!body.draftId) throw new HttpError(400, 'draft_id_required');

  const { data: existing, error: draftError } = await client
    .from('kam_drafts')
    .select('*')
    .eq('id', body.draftId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (draftError) throw new HttpError(500, 'draft_lookup_failed');
  if (!existing) throw new HttpError(404, 'draft_not_found');
  if (existing.status === 'APPROVED') {
    throw new HttpError(400, 'draft_locked');
  }

  const updates: Database['public']['Tables']['kam_drafts']['Update'] = {
    updated_by_user_id: user.id,
  };

  if (body.heading !== undefined) updates.heading = body.heading;
  if (body.whyKam !== undefined) updates.why_kam = body.whyKam;
  if (body.howAddressed !== undefined) updates.how_addressed = body.howAddressed;
  if (body.resultsSummary !== undefined) updates.results_summary = body.resultsSummary;
  if (body.proceduresRefs !== undefined) updates.procedures_refs = body.proceduresRefs;
  if (body.evidenceRefs !== undefined) updates.evidence_refs = body.evidenceRefs;

  const { data, error } = await client
    .from('kam_drafts')
    .update(updates)
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) throw new HttpError(500, 'draft_update_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'KAM_DRAFT_UPDATED',
    entityType: 'KAM_DRAFT',
    entityId: data.id,
  });

  return jsonResponse(200, { draft: data });
}

async function handleDraftSubmit(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  requireRole(role, 'EMPLOYEE');

  await assertAcceptance(client, orgId, engagement.id);

  if (!body.draftId) throw new HttpError(400, 'draft_id_required');

  const { data: draft, error: draftError } = await client
    .from('kam_drafts')
    .select('*')
    .eq('id', body.draftId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (draftError) throw new HttpError(500, 'draft_lookup_failed');
  if (!draft) throw new HttpError(404, 'draft_not_found');
  if (draft.status === 'APPROVED') throw new HttpError(400, 'draft_already_approved');

  await ensureProceduresExist(client, orgId, draft.engagement_id, draft.procedures_refs as any);
  await ensureEvidenceExists(client, orgId, draft.engagement_id, draft.evidence_refs as any);

  if (!draft.heading || !draft.why_kam || !draft.how_addressed || !draft.results_summary) {
    throw new HttpError(400, 'draft_fields_incomplete');
  }

  const { data: updated, error: updateError } = await client
    .from('kam_drafts')
    .update({
      status: 'READY_FOR_REVIEW' as DraftStatus,
      submitted_at: new Date().toISOString(),
      updated_by_user_id: user.id,
    })
    .eq('id', draft.id)
    .select('*')
    .single();

  if (updateError) throw new HttpError(500, 'draft_submit_failed');

  await ensureApprovalStages(client, {
    orgId,
    engagementId: engagement.id,
    candidateId: draft.candidate_id,
    draftId: draft.id,
    createdBy: user.id,
    eqrRequired: engagement.eqr_required,
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'KAM_DRAFT_SUBMITTED',
    entityType: 'KAM_DRAFT',
    entityId: draft.id,
  });

  return jsonResponse(200, { draft: updated });
}

async function handleApprovalDecision(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);

  const approvalId = body.approvalId as string | undefined;
  const decisionRaw = body.decision as string | undefined;
  const decision = decisionRaw ? decisionRaw.toUpperCase() : undefined;
  const note = body.note as string | undefined;

  if (!approvalId) throw new HttpError(400, 'approval_id_required');
  if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
    throw new HttpError(400, 'invalid_decision');
  }

  const { data: approval, error: approvalError } = await client
    .from('approval_queue')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('id', approvalId)
    .maybeSingle();
  if (approvalError) throw new HttpError(500, 'approval_lookup_failed');
  if (!approval || approval.kind !== 'KAM_DRAFT') throw new HttpError(404, 'approval_not_found');

  const { data: draft, error: draftError } = await client
    .from('kam_drafts')
    .select('*')
    .eq('id', approval.draft_id)
    .maybeSingle();
  if (draftError) throw new HttpError(500, 'draft_lookup_failed');
  if (!draft) throw new HttpError(404, 'draft_not_found');

  const resolvedAt = new Date().toISOString();
  const { error: updateError } = await client
    .from('approval_queue')
    .update({
      status: decision as Database['public']['Enums']['approval_status'],
      resolved_at: resolvedAt,
      resolved_by_user_id: user.id,
      resolution_note: note ?? null,
    })
    .eq('id', approval.id);
  if (updateError) throw new HttpError(500, 'approval_update_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: `KAM_DRAFT_APPROVAL_${decision}`,
    entityType: 'KAM_DRAFT',
    entityId: draft.id,
    metadata: { approvalId: approval.id, stage: approval.stage },
  });

  await finalizeDraftStatus(client, {
    orgId,
    engagementId: engagement.id,
    draft,
    userId: user.id,
  });

  const approvals = await loadApprovals(client, { orgId, draftId: draft.id });
  return jsonResponse(200, { approvals });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'missing_authorization' });
  }

  const client = createSupabaseClient(authHeader);

  try {
    const user = await getUser(client);
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/audit-kam/, '') || '/';

    if (req.method === 'GET' && pathname === '/list') {
      return await handleList(client, user, url);
    }

    if (req.method === 'GET' && pathname === '/export') {
      return await handleExport(client, user, url);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (pathname === '/candidate/add') {
        return await handleCandidateAdd(client, user, body);
      }

      if (pathname === '/candidate/select') {
        return await handleCandidateStatus(client, user, body, 'SELECTED');
      }

      if (pathname === '/candidate/exclude') {
        return await handleCandidateStatus(client, user, body, 'EXCLUDED');
      }

      if (pathname === '/draft/create') {
        return await handleDraftCreate(client, user, body);
      }

      if (pathname === '/draft/update') {
        return await handleDraftUpdate(client, user, body);
      }

      if (pathname === '/draft/submit') {
        return await handleDraftSubmit(client, user, body);
      }
      if (pathname === '/approval/decide') {
        return await handleApprovalDecision(client, user, body);
      }
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-kam-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
