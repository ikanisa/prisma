import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { evaluateOpinion } from '../../../src/utils/report-evaluation.ts';
import { ensureAcceptanceApproved } from '../_shared/acceptance.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type AuditOpinion = Database['public']['Enums']['audit_opinion'];

type SupabaseUser = { id: string; email?: string };

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
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function createSupabaseClient(authHeader: string): Promise<TypedClient> {
  return createSupabaseClientWithAuth<Database>(authHeader);
}

async function getUser(client: TypedClient): Promise<SupabaseUser> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, 'invalid_token');
  }
  return { id: data.user.id, email: data.user.email ?? undefined };
}

async function getOrgContext(client: TypedClient, orgSlug: string | null, userId: string) {
  if (!orgSlug) throw new HttpError(400, 'org_slug_required');
  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('id')
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

async function fetchEngagement(client: TypedClient, orgId: string, engagementId: string | null) {
  if (!engagementId) throw new HttpError(400, 'engagement_id_required');
  const { data, error } = await client
    .from('engagements')
    .select('id, org_id, eqr_required')
    .eq('id', engagementId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'engagement_lookup_failed');
  if (!data || data.org_id !== orgId) throw new HttpError(404, 'engagement_not_found');
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
  params: { orgId: string; userId: string; action: string; entityId: string; metadata?: Record<string, unknown> },
) {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: 'AUDIT_REPORT_DRAFT',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

function renderHtml(params: {
  opinion: AuditOpinion;
  basisForOpinion?: string | null;
  includeEom: boolean;
  eomText?: string | null;
  includeOm: boolean;
  omText?: string | null;
  incorporateKams: boolean;
  kamSections: Array<{ heading: string; why_kam: string | null; how_addressed: string | null; results_summary: string | null }>;
  gcDisclosure: boolean;
}): string {
  const parts: string[] = [];
  parts.push(`<h2>Opinion</h2>`);
  parts.push(`<p>In our opinion, the financial statements present fairly in all material respects.</p>`);
  parts.push(`<p>Opinion type: ${params.opinion}</p>`);

  parts.push('<h2>Basis for Opinion</h2>');
  if (params.basisForOpinion) {
    parts.push(`<p>${params.basisForOpinion}</p>`);
  }
  parts.push('<p>We conducted our audit in accordance with ISAs and remain independent per the IESBA Code.</p>');

  if (params.gcDisclosure) {
    parts.push('<h2>Material Uncertainty Related to Going Concern</h2>');
    parts.push('<p>There exists a material uncertainty related to going concern as disclosed in the financial statements.</p>');
  }

  if (params.incorporateKams && params.kamSections.length > 0) {
    parts.push('<h2>Key Audit Matters</h2>');
    for (const kam of params.kamSections) {
      parts.push(`<h3>${kam.heading}</h3>`);
      if (kam.why_kam) parts.push(`<p><strong>Why it was a KAM:</strong> ${kam.why_kam}</p>`);
      if (kam.how_addressed) parts.push(`<p><strong>How we addressed:</strong> ${kam.how_addressed}</p>`);
      if (kam.results_summary) parts.push(`<p><strong>Results:</strong> ${kam.results_summary}</p>`);
    }
  }

  if (params.includeEom && params.eomText) {
    parts.push('<h2>Emphasis of Matter</h2>');
    parts.push(`<p>${params.eomText}</p>`);
  }

  if (params.includeOm && params.omText) {
    parts.push('<h2>Other Matter</h2>');
    parts.push(`<p>${params.omText}</p>`);
  }

  parts.push('<h2>Responsibilities of Management and Those Charged with Governance</h2>');
  parts.push('<p>Management is responsible for the preparation of the financial statements and for such internal control as management determines is necessary.</p>');

  parts.push('<h2>Auditor’s Responsibilities</h2>');
  parts.push('<p>Our objectives are to obtain reasonable assurance whether the financial statements are free from material misstatement.</p>');

  return parts.join('\n');
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createPdfBuffer(content: string): Uint8Array {
  const lines = content
    .split(/\r?\n/)
    .map((line) => escapePdfText(line.trim()))
    .filter((line) => line.length > 0);

  const streamParts = ['BT', '/F1 12 Tf', '72 770 Td'];
  for (let i = 0; i < lines.length; i += 1) {
    streamParts.push(`(${lines[i]}) Tj`);
    if (i < lines.length - 1) {
      streamParts.push('T*');
    }
  }
  streamParts.push('ET');
  const stream = streamParts.join('\n');
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(stream);

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
  objects.push(`4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  let position = pdf.length;
  for (const object of objects) {
    offsets.push(position);
    pdf += object;
    position = pdf.length;
  }
  const xrefOffset = position;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    const padded = offset.toString().padStart(10, '0');
    pdf += `${padded} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}

async function ensureBucket(client: TypedClient, bucket: string) {
  const { data } = await client.storage.getBucket(bucket);
  if (!data) {
    const { error } = await client.storage.createBucket(bucket, { public: false });
    if (error && error.name !== 'BucketAlreadyExists') {
      throw new HttpError(500, 'storage_bucket_create_failed');
    }
  }
}

async function storeDocument(
  client: TypedClient,
  params: {
    orgId: string;
    engagementId: string;
    userId: string;
    name: string;
    path: string;
    contentType: string;
    data: Uint8Array;
  },
) {
  await ensureBucket(client, 'reports');

  const upload = await client.storage.from('reports').upload(params.path, params.data, {
    contentType: params.contentType,
    upsert: true,
  });
  if (upload.error) {
    throw new HttpError(500, 'storage_upload_failed');
  }

  const { data, error } = await client
    .from('documents')
    .insert({
      org_id: params.orgId,
      engagement_id: params.engagementId,
      name: params.name,
      file_path: params.path,
      file_type: params.contentType,
      uploaded_by: params.userId,
    })
    .select('id')
    .single();
  if (error) {
    throw new HttpError(500, 'document_create_failed');
  }
  return data.id as string;
}

async function fetchApprovedKams(client: TypedClient, orgId: string, engagementId: string, ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const { data, error } = await client
    .from('kam_drafts')
    .select('id')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .eq('status', 'APPROVED')
    .in('id', ids);
  if (error) throw new HttpError(500, 'kam_lookup_failed');
  return (data ?? []).map((row) => row.id);
}

async function loadKamSections(client: TypedClient, orgId: string, engagementId: string, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await client
    .from('kam_drafts')
    .select('id, heading, why_kam, how_addressed, results_summary')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .eq('status', 'APPROVED')
    .in('id', ids);
  if (error) throw new HttpError(500, 'kam_section_fetch_failed');
  return data ?? [];
}

async function handleDecisionTree(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  await assertAcceptance(client, orgId, engagement.id);

  const { data: misstatements, error: misError } = await client
    .from('misstatements')
    .select('classification, corrected')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id);
  if (misError) throw new HttpError(500, 'misstatements_lookup_failed');

  const { data: gcWorksheet, error: gcError } = await client
    .from('going_concern_worksheets')
    .select('assessment')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('assessment', 'MATERIAL_UNCERTAINTY')
    .maybeSingle();
  if (gcError) throw new HttpError(500, 'gc_lookup_failed');

  const scopeLimitations = (misstatements ?? []).some((m) => (m.classification ?? '').toLowerCase().includes('scope'));

  const evalResult = evaluateOpinion({
    misstatements: misstatements ?? [],
    goingConcernMU: Boolean(gcWorksheet),
    scopeLimitations,
  });

  return jsonResponse(200, {
    recommendedOpinion: evalResult.recommendedOpinion,
    reasons: evalResult.reasons,
    requiredSections: evalResult.requiredSections,
    goingConcernMaterialUncertainty: Boolean(gcWorksheet),
  });
}

async function handleCreate(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  await assertAcceptance(client, orgId, engagement.id);

  const { data: approvedKams, error: kamError } = await client
    .from('kam_drafts')
    .select('id')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('status', 'APPROVED');
  if (kamError) throw new HttpError(500, 'kam_fetch_failed');

  const { data: gcWorksheet } = await client
    .from('going_concern_worksheets')
    .select('assessment')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('assessment', 'MATERIAL_UNCERTAINTY')
    .maybeSingle();

  const kamIds = (approvedKams ?? []).map((k) => k.id);
  const kamSections = await loadKamSections(client, orgId, engagement.id, kamIds);
  const html = renderHtml({
    opinion: 'UNMODIFIED',
    basisForOpinion: null,
    includeEom: false,
    includeOm: false,
    incorporateKams: kamSections.length > 0,
    kamSections,
    gcDisclosure: Boolean(gcWorksheet),
  });

  const { data, error } = await client
    .from('audit_report_drafts')
    .insert({
      org_id: orgId,
      engagement_id: engagement.id,
      kam_ids: kamIds,
      gc_disclosure_required: Boolean(gcWorksheet),
      draft_html: html,
      created_by_user_id: user.id,
      updated_by_user_id: user.id,
    })
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'report_create_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'REPORT_DRAFT_CREATED',
    entityId: data.id,
    metadata: { kamIds, gcDisclosure: Boolean(gcWorksheet) },
  });

  return jsonResponse(201, { report: data });
}

async function handleUpdate(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  await assertAcceptance(client, orgId, engagement.id);

  if (!body.reportId) throw new HttpError(400, 'report_id_required');

  const { data: existing, error: reportError } = await client
    .from('audit_report_drafts')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('id', body.reportId)
    .maybeSingle();
  if (reportError) throw new HttpError(500, 'report_lookup_failed');
  if (!existing) throw new HttpError(404, 'report_not_found');
  if (existing.status === 'RELEASED') throw new HttpError(400, 'report_released');

  const nextKamIds: string[] = Array.isArray(body.kamIds) ? body.kamIds : existing.kam_ids ?? [];
  const validKamIds = await fetchApprovedKams(client, orgId, engagement.id, nextKamIds);
  const kamSections = await loadKamSections(client, orgId, engagement.id, validKamIds);

  const opinion: AuditOpinion = body.opinion ?? existing.opinion;
  const includeEom = body.includeEOM ?? existing.include_eom ?? false;
  const includeOm = body.includeOM ?? existing.include_om ?? false;
  const gcDisclosure = body.gcDisclosureRequired ?? existing.gc_disclosure_required ?? false;

  const html = renderHtml({
    opinion,
    basisForOpinion: body.basisForOpinion ?? existing.basis_for_opinion,
    includeEom,
    eomText: body.eomText ?? existing.eom_text,
    includeOm,
    omText: body.omText ?? existing.om_text,
    incorporateKams: body.incorporateKAMs ?? existing.incorporate_kams ?? true,
    kamSections,
    gcDisclosure,
  });

  const { data, error } = await client
    .from('audit_report_drafts')
    .update({
      opinion,
      basis_for_opinion: body.basisForOpinion ?? existing.basis_for_opinion,
      include_eom: includeEom,
      eom_text: body.eomText ?? existing.eom_text,
      include_om: includeOm,
      om_text: body.omText ?? existing.om_text,
      incorporate_kams: body.incorporateKAMs ?? existing.incorporate_kams ?? true,
      kam_ids: validKamIds,
      gc_disclosure_required: gcDisclosure,
      draft_html: html,
      status: 'DRAFT',
      updated_by_user_id: user.id,
    })
    .eq('id', existing.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'report_update_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'REPORT_DRAFT_UPDATED',
    entityId: data.id,
    metadata: { opinion },
  });

  return jsonResponse(200, { report: data });
}

async function ensureApprovalStages(
  client: TypedClient,
  params: { orgId: string; engagementId: string; reportId: string; createdBy: string; eqrRequired: boolean | null },
) {
  const stages: Array<'MANAGER' | 'PARTNER' | 'EQR'> = ['MANAGER', 'PARTNER'];
  if (params.eqrRequired) stages.push('EQR');

  const { data: existing, error } = await client
    .from('approval_queue')
    .select('id, stage')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .eq('draft_id', params.reportId)
    .eq('kind', 'REPORT_FINAL');
  if (error) throw new HttpError(500, 'approval_lookup_failed');
  const stagesPresent = new Set(existing?.map((row) => row.stage));

  for (const stage of stages) {
    if (!stagesPresent.has(stage)) {
      const { error: insertError } = await client.from('approval_queue').insert({
        org_id: params.orgId,
        engagement_id: params.engagementId,
        kind: 'REPORT_FINAL',
        stage,
        draft_id: params.reportId,
        created_by_user_id: params.createdBy,
        updated_by_user_id: params.createdBy,
        payload: { reportId: params.reportId, stage },
      });
      if (insertError) throw new HttpError(500, 'approval_queue_create_failed');
    }
  }
}

async function handleSubmit(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  await assertAcceptance(client, orgId, engagement.id);

  if (!body.reportId) throw new HttpError(400, 'report_id_required');

  const { data: existing, error: reportError } = await client
    .from('audit_report_drafts')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', body.reportId)
    .maybeSingle();
  if (reportError) throw new HttpError(500, 'report_lookup_failed');
  if (!existing) throw new HttpError(404, 'report_not_found');
  if (existing.status === 'RELEASED') throw new HttpError(400, 'report_released');

  if (!existing.draft_html) throw new HttpError(400, 'draft_html_missing');

  const { data, error } = await client
    .from('audit_report_drafts')
    .update({
      status: 'READY_FOR_REVIEW',
      updated_by_user_id: user.id,
    })
    .eq('id', existing.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'report_submit_failed');

  await ensureApprovalStages(client, {
    orgId,
    engagementId: engagement.id,
    reportId: existing.id,
    createdBy: user.id,
    eqrRequired: engagement.eqr_required,
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'REPORT_DRAFT_SUBMITTED',
    entityId: existing.id,
  });

  return jsonResponse(200, { report: data });
}

async function handleRelease(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  await assertAcceptance(client, orgId, engagement.id);

  if (!body.reportId) throw new HttpError(400, 'report_id_required');

  const { data: existing, error: reportError } = await client
    .from('audit_report_drafts')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', body.reportId)
    .maybeSingle();
  if (reportError) throw new HttpError(500, 'report_lookup_failed');
  if (!existing) throw new HttpError(404, 'report_not_found');
  if (existing.status !== 'APPROVED') throw new HttpError(400, 'report_not_approved');

  const { data, error } = await client
    .from('audit_report_drafts')
    .update({
      status: 'RELEASED',
      updated_by_user_id: user.id,
    })
    .eq('id', existing.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'report_release_failed');

  const tcwgContent = new TextEncoder().encode(
    `TCWG communication placeholder for engagement ${engagement.id} (report ${existing.id}).\nStatus: RELEASED at ${new Date().toISOString()}.`,
  );
  const tcwgPath = `tcwg/${engagement.id}/report_${existing.id}.md`;
  await storeDocument(client, {
    orgId,
    engagementId: engagement.id,
    userId: user.id,
    name: `TCWG pack - ${existing.id}.md`,
    path: tcwgPath,
    contentType: 'text/markdown',
    data: tcwgContent,
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'REPORT_RELEASED',
    entityId: existing.id,
  });

  return jsonResponse(200, { report: data });
}

async function handleExportPdf(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);
  const reportId = body.reportId as string | undefined;
  if (!reportId) throw new HttpError(400, 'report_id_required');

  const { data: report, error } = await client
    .from('audit_report_drafts')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'report_lookup_failed');
  if (!report) throw new HttpError(404, 'report_not_found');
  if (!report.draft_html) throw new HttpError(400, 'draft_html_missing');

  const plainText = report.draft_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const pdfBuffer = createPdfBuffer(plainText || 'Audit report draft');
  const path = `reports/${orgId}/${engagement.id}/audit-report-${report.id}.pdf`;
  const documentId = await storeDocument(client, {
    orgId,
    engagementId: engagement.id,
    userId: user.id,
    name: `Audit report ${report.id}.pdf`,
    path,
    contentType: 'application/pdf',
    data: pdfBuffer,
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'REPORT_EXPORTED_PDF',
    entityId: report.id,
    metadata: { path },
  });

  return jsonResponse(200, { documentId, path });
}

async function handleGet(client: TypedClient, user: SupabaseUser, url: URL) {
  const orgSlug = url.searchParams.get('orgSlug');
  const engagementId = url.searchParams.get('engagementId');
  const { orgId } = await getOrgContext(client, orgSlug, user.id);
  const engagement = await fetchEngagement(client, orgId, engagementId);

  await assertAcceptance(client, orgId, engagement.id);

  const { data, error } = await client
    .from('audit_report_drafts')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new HttpError(500, 'report_get_failed');

  const { data: approvals } = await client
    .from('approval_queue')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('kind', 'REPORT_FINAL')
    .order('created_at', { ascending: true });

  return jsonResponse(200, { report: data ?? null, approvals: approvals ?? [] });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return jsonResponse(401, { error: 'missing_authorization' });

  const client = await createSupabaseClient(authHeader);

  try {
    const user = await getUser(client);
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/audit-report/, '') || '/';

    if (req.method === 'GET' && pathname === '/get') {
      return await handleGet(client, user, url);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (pathname === '/draft/create') {
        return await handleCreate(client, user, body);
      }
      if (pathname === '/draft/update') {
        return await handleUpdate(client, user, body);
      }
      if (pathname === '/decision-tree') {
        return await handleDecisionTree(client, user, body);
      }
      if (pathname === '/submit') {
        return await handleSubmit(client, user, body);
      }
      if (pathname === '/release') {
        return await handleRelease(client, user, body);
      }
      if (pathname === '/export/pdf') {
        return await handleExportPdf(client, user, body);
      }
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-report-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
