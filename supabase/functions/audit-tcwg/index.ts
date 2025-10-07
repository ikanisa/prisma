import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';
import JSZip from 'https://deno.land/x/jszip@0.11.0/mod.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { buildTcwgMarkdown } from '../../../src/utils/tcwg-pack.ts';
import { ensureAcceptanceApproved } from '../_shared/acceptance.ts';
import { logEdgeError } from '../_shared/error-notify.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type TcwgStatus = Database['public']['Enums']['tcwg_pack_status'];

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
  if (error || !data.user) throw new HttpError(401, 'invalid_token');
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
  if (roleRank[current] < roleRank[min]) throw new HttpError(403, 'insufficient_role');
}

async function fetchEngagement(client: TypedClient, orgId: string, engagementId: string | null) {
  if (!engagementId) throw new HttpError(400, 'engagement_id_required');
  const { data, error } = await client
    .from('engagements')
    .select('id, org_id, eqr_required, title')
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
    entity_type: 'TCWG_PACK',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

async function loadTemplate(relativePath: string) {
  const url = new URL(relativePath, import.meta.url);
  return await Deno.readTextFile(url);
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createPdfBuffer(content: string): Uint8Array {
  const lines = content
    .split(/\r?\n/)
    .map((line) => escapePdfText(line.trim()))
    .filter((line) => line.length > 0);

  const streamParts = ['BT', '/F1 11 Tf', '54 760 Td'];
  for (let i = 0; i < lines.length; i += 1) {
    streamParts.push(`(${lines[i]}) Tj`);
    if (i < lines.length - 1) streamParts.push('T*');
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
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}

async function ensureBucket(client: TypedClient, bucket: string) {
  const { data } = await client.storage.getBucket(bucket);
  if (!data) {
    const { error } = await client.storage.createBucket(bucket, { public: false });
    if (error && error.name !== 'BucketAlreadyExists') {
      throw new HttpError(500, 'storage_bucket_failed');
    }
  }
}

async function storeDocument(
  client: TypedClient,
  params: { orgId: string; engagementId: string; userId: string; bucket: string; path: string; name: string; data: Uint8Array; contentType: string },
) {
  await ensureBucket(client, params.bucket);
  const upload = await client.storage.from(params.bucket).upload(params.path, params.data, {
    contentType: params.contentType,
    upsert: true,
  });
  if (upload.error) throw new HttpError(500, 'storage_upload_failed');

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
  if (error) throw new HttpError(500, 'document_create_failed');
  return data.id as string;
}

async function fetchMisstatements(client: TypedClient, orgId: string, engagementId: string) {
  const { data, error } = await client
    .from('misstatements')
    .select('id, amount, classification, corrected, description')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId);
  if (error) throw new HttpError(500, 'misstatements_lookup_failed');
  return data ?? [];
}

async function fetchApprovedKams(client: TypedClient, orgId: string, engagementId: string) {
  const { data, error } = await client
    .from('kam_drafts')
    .select('id, heading, why_kam, how_addressed, results_summary')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .eq('status', 'APPROVED');
  if (error) throw new HttpError(500, 'kam_lookup_failed');
  return data ?? [];
}

async function fetchGoingConcern(client: TypedClient, orgId: string, engagementId: string) {
  const { data } = await client
    .from('going_concern_worksheets')
    .select('assessment, conclusion, indicators')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function fetchReportDraft(client: TypedClient, orgId: string, engagementId: string) {
  const { data } = await client
    .from('audit_report_drafts')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function ensureApprovalStages(
  client: TypedClient,
  params: { orgId: string; engagementId: string; packId: string; createdBy: string; eqrRequired: boolean | null },
) {
  const stages: Array<'MANAGER' | 'PARTNER' | 'EQR'> = ['MANAGER', 'PARTNER'];
  if (params.eqrRequired) stages.push('EQR');

  const { data: existing, error } = await client
    .from('approval_queue')
    .select('stage')
    .eq('org_id', params.orgId)
    .eq('draft_id', params.packId)
    .eq('kind', 'TCWG_PACK');
  if (error) throw new HttpError(500, 'approval_lookup_failed');
  const stagesPresent = new Set(existing?.map((row) => row.stage));

  for (const stage of stages) {
    if (!stagesPresent.has(stage)) {
      const { error: insertError } = await client.from('approval_queue').insert({
        org_id: params.orgId,
        engagement_id: params.engagementId,
        kind: 'TCWG_PACK',
        stage,
        draft_id: params.packId,
        created_by_user_id: params.createdBy,
        updated_by_user_id: params.createdBy,
        payload: { packId: params.packId, stage },
      });
      if (insertError) throw new HttpError(500, 'approval_queue_create_failed');
    }
  }
}

async function loadApprovals(client: TypedClient, packId: string, orgId: string) {
  const { data, error } = await client
    .from('approval_queue')
    .select('id, stage, status, resolved_at, resolved_by_user_id, resolution_note')
    .eq('org_id', orgId)
    .eq('draft_id', packId)
    .eq('kind', 'TCWG_PACK');
  if (error) throw new HttpError(500, 'approval_lookup_failed');
  return data ?? [];
}

async function finalizePackStatus(
  client: TypedClient,
  params: { orgId: string; engagementId: string; pack: Database['public']['Tables']['tcwg_packs']['Row']; userId: string },
) {
  const approvals = await loadApprovals(client, params.pack.id, params.orgId);
  const anyRejected = approvals.some((item) => item.status === 'REJECTED');
  const allApproved = approvals.length > 0 && approvals.every((item) => item.status === 'APPROVED');

  if (anyRejected) {
    const { error } = await client
      .from('tcwg_packs')
      .update({
        status: 'DRAFT' as TcwgStatus,
        updated_by_user_id: params.userId,
        approved_by_user_id: null,
        approved_at: null,
        eqr_approved_by_user_id: null,
        eqr_approved_at: null,
      })
      .eq('id', params.pack.id);
    if (error) throw new HttpError(500, 'tcwg_reject_update_failed');

    await logActivity(client, {
      orgId: params.orgId,
      userId: params.userId,
      action: 'TCWG_REJECTED',
      entityId: params.pack.id,
    });
    return;
  }

  if (allApproved) {
    const partnerApproval = approvals.find((item) => item.stage === 'PARTNER');
    const eqrApproval = approvals.find((item) => item.stage === 'EQR');

    const updatePayload: Database['public']['Tables']['tcwg_packs']['Update'] = {
      status: 'APPROVED' as TcwgStatus,
      updated_by_user_id: params.userId,
      approved_by_user_id: partnerApproval?.resolved_by_user_id ?? params.userId,
      approved_at: partnerApproval?.resolved_at ?? new Date().toISOString(),
    };
    if (eqrApproval) {
      updatePayload.eqr_approved_by_user_id = eqrApproval.resolved_by_user_id ?? params.userId;
      updatePayload.eqr_approved_at = eqrApproval.resolved_at ?? new Date().toISOString();
    }

    const { error } = await client
      .from('tcwg_packs')
      .update(updatePayload)
      .eq('id', params.pack.id);
    if (error) throw new HttpError(500, 'tcwg_approve_update_failed');

    await logActivity(client, {
      orgId: params.orgId,
      userId: params.userId,
      action: eqrApproval ? 'TCWG_APPROVED_EQR' : 'TCWG_APPROVED',
      entityId: params.pack.id,
      metadata: { partnerApproval: partnerApproval?.id, eqrApproval: eqrApproval?.id },
    });
  }
}

async function updateArchive(
  client: TypedClient,
  params: { orgId: string; engagementId: string; zipDocumentId: string; pdfDocumentId: string | null; sha256: string },
) {
  const { data: existing } = await client
    .from('engagement_archives')
    .select('id, manifest')
    .eq('engagement_id', params.engagementId)
    .maybeSingle();

  const manifest = existing?.manifest ?? {};
  const updatedManifest = {
    ...manifest,
    tcwg: {
      zipDocumentId: params.zipDocumentId,
      pdfDocumentId: params.pdfDocumentId,
      sha256: params.sha256,
      updatedAt: new Date().toISOString(),
    },
  };

  if (existing) {
    const { error } = await client
      .from('engagement_archives')
      .update({ manifest: updatedManifest, sha256: params.sha256 })
      .eq('id', existing.id);
    if (error) throw new HttpError(500, 'archive_update_failed');
  } else {
    const { error } = await client.from('engagement_archives').insert({
      org_id: params.orgId,
      engagement_id: params.engagementId,
      manifest: updatedManifest,
      sha256: params.sha256,
    });
    if (error) throw new HttpError(500, 'archive_insert_failed');
  }
}

async function handleCreate(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);

  const reportDraft = await fetchReportDraft(client, orgId, engagement.id);
  const misstatements = await fetchMisstatements(client, orgId, engagement.id);
  const approvedKams = await fetchApprovedKams(client, orgId, engagement.id);
  const goingConcern = await fetchGoingConcern(client, orgId, engagement.id);

  const uncorrected = misstatements.filter((item) => !item.corrected);
  const corrected = misstatements.filter((item) => item.corrected);

  const kamSummary = approvedKams.map((kam) => ({
    id: kam.id,
    heading: kam.heading,
    why: kam.why_kam,
    how: kam.how_addressed,
    results: kam.results_summary,
  }));

  const independenceTemplate = await loadTemplate('../../../STANDARDS/TEMPLATES/tcwg/independence_statement.md');

  const { data, error } = await client
    .from('tcwg_packs')
    .insert({
      org_id: orgId,
      engagement_id: engagement.id,
      report_draft_id: reportDraft?.id ?? null,
      independence_statement: independenceTemplate.replaceAll('{{ engagement_name }}', engagement.title ?? engagement.id),
      scope_summary: 'Our audit strategy focused on the significant risks identified during planning, with an emphasis on data-driven testing and targeted substantive procedures.',
      significant_findings: reportDraft?.draft_html ? 'See report for detailed findings; key matters summarised in Annex C.' : null,
      uncorrected_misstatements: uncorrected as any,
      corrected_misstatements: corrected as any,
      deficiencies: [] as any,
      kam_summary: kamSummary as any,
      going_concern_summary: goingConcern ? (goingConcern as any) : {} as any,
      subsequent_events_summary: {} as any,
      created_by_user_id: user.id,
      updated_by_user_id: user.id,
    })
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'tcwg_create_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'TCWG_CREATE',
    entityId: data.id,
    metadata: { reportDraftId: reportDraft?.id ?? null },
  });

  return jsonResponse(201, { pack: data });
}

async function handleUpdate(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);

  const packId = body.packId as string | undefined;
  if (!packId) throw new HttpError(400, 'pack_id_required');

  const { data: existing, error: packError } = await client
    .from('tcwg_packs')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('id', packId)
    .maybeSingle();
  if (packError) throw new HttpError(500, 'tcwg_lookup_failed');
  if (!existing) throw new HttpError(404, 'tcwg_not_found');

  const updates: Database['public']['Tables']['tcwg_packs']['Update'] = {
    updated_by_user_id: user.id,
  };

  if (body.independenceStatement !== undefined) updates.independence_statement = body.independenceStatement;
  if (body.scopeSummary !== undefined) updates.scope_summary = body.scopeSummary;
  if (body.significantFindings !== undefined) updates.significant_findings = body.significantFindings;
  if (body.significantDifficulties !== undefined) updates.significant_difficulties = body.significantDifficulties;
  if (body.deficiencies !== undefined) updates.deficiencies = body.deficiencies;
  if (body.otherMatters !== undefined) updates.other_matters = body.otherMatters;
  if (body.goingConcernSummary !== undefined) updates.going_concern_summary = body.goingConcernSummary;
  if (body.subsequentEventsSummary !== undefined) updates.subsequent_events_summary = body.subsequentEventsSummary;
  if (body.uncorrectedMisstatements !== undefined) updates.uncorrected_misstatements = body.uncorrectedMisstatements;
  if (body.correctedMisstatements !== undefined) updates.corrected_misstatements = body.correctedMisstatements;
  if (body.kamSummary !== undefined) updates.kam_summary = body.kamSummary;

  const { data, error } = await client
    .from('tcwg_packs')
    .update(updates)
    .eq('id', packId)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'tcwg_update_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'TCWG_UPDATE',
    entityId: packId,
  });

  return jsonResponse(200, { pack: data });
}

async function handleRender(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);

  const packId = body.packId as string | undefined;
  if (!packId) throw new HttpError(400, 'pack_id_required');

  const { data: pack, error: packError } = await client
    .from('tcwg_packs')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('id', packId)
    .maybeSingle();
  if (packError) throw new HttpError(500, 'tcwg_lookup_failed');
  if (!pack) throw new HttpError(404, 'tcwg_not_found');

  const template = await loadTemplate('../../../STANDARDS/TEMPLATES/tcwg/tcwg_pack_shell.md');
  const content = buildTcwgMarkdown(template, {
    scopeSummary: pack.scope_summary,
    independenceStatement: pack.independence_statement,
    significantFindings: pack.significant_findings,
    significantDifficulties: pack.significant_difficulties,
    uncorrected: (pack.uncorrected_misstatements as any[]) ?? [],
    corrected: (pack.corrected_misstatements as any[]) ?? [],
    deficiencies: (pack.deficiencies as any[]) ?? [],
    kamSummary: (pack.kam_summary as any[]) ?? [],
    goingConcern: (pack.going_concern_summary as Record<string, unknown>) ?? {},
    subsequentEvents: (pack.subsequent_events_summary as Record<string, unknown>) ?? {},
    otherMatters: pack.other_matters,
  });

  const pdfBuffer = createPdfBuffer(content);
  const bucket = 'tcwg';
  const path = `packs/${engagement.id}/tcwg_pack_${pack.id}.pdf`;
  const documentId = await storeDocument(client, {
    orgId,
    engagementId: engagement.id,
    userId: user.id,
    bucket,
    path,
    name: `TCWG Pack ${pack.id}.pdf`,
    data: pdfBuffer,
    contentType: 'application/pdf',
  });

  const { data, error } = await client
    .from('tcwg_packs')
    .update({ pdf_document_id: documentId, updated_by_user_id: user.id })
    .eq('id', pack.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'tcwg_render_update_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'TCWG_RENDERED',
    entityId: pack.id,
    metadata: { pdfDocumentId: documentId },
  });

  return jsonResponse(200, { pack: data, documentId });
}

async function handleBuildZip(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);

  const packId = body.packId as string | undefined;
  if (!packId) throw new HttpError(400, 'pack_id_required');

  const { data: pack, error: packError } = await client
    .from('tcwg_packs')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('id', packId)
    .maybeSingle();
  if (packError) throw new HttpError(500, 'tcwg_lookup_failed');
  if (!pack) throw new HttpError(404, 'tcwg_not_found');
  if (!pack.pdf_document_id) throw new HttpError(400, 'pdf_required_before_zip');

  const pdfDownload = await client.storage.from('tcwg').download(`packs/${engagement.id}/tcwg_pack_${pack.id}.pdf`);
  if (pdfDownload.error) throw new HttpError(500, 'pdf_download_failed');
  const pdfArray = new Uint8Array(await pdfDownload.data.arrayBuffer());

  const zip = new JSZip();
  zip.file(`TCWG_Pack_${pack.id}.pdf`, pdfArray);
  zip.file('annex_uncorrected.json', JSON.stringify(pack.uncorrected_misstatements, null, 2));
  zip.file('annex_corrected.json', JSON.stringify(pack.corrected_misstatements, null, 2));
  zip.file('annex_deficiencies.json', JSON.stringify(pack.deficiencies, null, 2));
  zip.file('annex_kams.json', JSON.stringify(pack.kam_summary, null, 2));
  zip.file('annex_going_concern.json', JSON.stringify(pack.going_concern_summary, null, 2));
  zip.file('annex_subsequent_events.json', JSON.stringify(pack.subsequent_events_summary, null, 2));

  const zipArray = new Uint8Array(await zip.generateAsync({ type: 'uint8array' }));
  const bucket = 'tcwg';
  const path = `packs/${engagement.id}/tcwg_pack_${pack.id}.zip`;
  const documentId = await storeDocument(client, {
    orgId,
    engagementId: engagement.id,
    userId: user.id,
    bucket,
    path,
    name: `TCWG Pack ${pack.id}.zip`,
    data: zipArray,
    contentType: 'application/zip',
  });

  const hashBuffer = await crypto.subtle.digest('SHA-256', zipArray);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const { data, error } = await client
    .from('tcwg_packs')
    .update({ zip_document_id: documentId, updated_by_user_id: user.id })
    .eq('id', pack.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'tcwg_zip_update_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'TCWG_ZIP_BUILT',
    entityId: pack.id,
    metadata: { zipDocumentId: documentId, sha256 },
  });

  return jsonResponse(200, { pack: data, documentId, sha256 });
}

async function handleSubmit(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);

  const packId = body.packId as string | undefined;
  if (!packId) throw new HttpError(400, 'pack_id_required');

  const { data: pack, error: packError } = await client
    .from('tcwg_packs')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('id', packId)
    .maybeSingle();
  if (packError) throw new HttpError(500, 'tcwg_lookup_failed');
  if (!pack) throw new HttpError(404, 'tcwg_not_found');
  if (!pack.pdf_document_id) throw new HttpError(400, 'render_pdf_before_submit');

  const { data, error } = await client
    .from('tcwg_packs')
    .update({ status: 'READY_FOR_REVIEW' as TcwgStatus, updated_by_user_id: user.id })
    .eq('id', packId)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'tcwg_submit_failed');

  await ensureApprovalStages(client, {
    orgId,
    engagementId: engagement.id,
    packId,
    createdBy: user.id,
    eqrRequired: engagement.eqr_required,
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'TCWG_SUBMITTED',
    entityId: packId,
  });

  return jsonResponse(200, { pack: data });
}

async function handleApprovalDecision(client: TypedClient, user: SupabaseUser, body: any) {
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
  if (!approval || approval.kind !== 'TCWG_PACK') throw new HttpError(404, 'approval_not_found');

  const { data: pack, error: packError } = await client
    .from('tcwg_packs')
    .select('*')
    .eq('id', approval.draft_id)
    .maybeSingle();
  if (packError) throw new HttpError(500, 'tcwg_lookup_failed');
  if (!pack) throw new HttpError(404, 'tcwg_not_found');

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
    action: `TCWG_APPROVAL_${decision}`,
    entityId: pack.id,
    metadata: { approvalId: approval.id, stage: approval.stage },
  });

  await finalizePackStatus(client, {
    orgId,
    engagementId: engagement.id,
    pack,
    userId: user.id,
  });

  const approvals = await loadApprovals(client, pack.id, orgId);
  return jsonResponse(200, { approvals });
}

async function handleSend(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);
  await assertAcceptance(client, orgId, engagement.id);

  const packId = body.packId as string | undefined;
  if (!packId) throw new HttpError(400, 'pack_id_required');

  const { data: pack, error: packError } = await client
    .from('tcwg_packs')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .eq('id', packId)
    .maybeSingle();
  if (packError) throw new HttpError(500, 'tcwg_lookup_failed');
  if (!pack) throw new HttpError(404, 'tcwg_not_found');
  if (pack.status !== 'APPROVED') throw new HttpError(400, 'pack_not_approved');
  if (!pack.zip_document_id) throw new HttpError(400, 'build_zip_before_send');

  const reportDraft = await fetchReportDraft(client, orgId, engagement.id);
  if (!reportDraft || reportDraft.status !== 'RELEASED') {
    throw new HttpError(400, 'report_not_released');
  }

  const signedPdf = pack.pdf_document_id
    ? await client.storage.from('tcwg').createSignedUrl(
        `packs/${engagement.id}/tcwg_pack_${pack.id}.pdf`,
        60 * 60 * 24 * 7,
      )
    : null;

  const zipDownload = await client.storage.from('tcwg').download(`packs/${engagement.id}/tcwg_pack_${pack.id}.zip`);
  if (zipDownload.error) throw new HttpError(500, 'zip_download_failed');
  const zipArray = new Uint8Array(await zipDownload.data.arrayBuffer());
  const hashBuffer = await crypto.subtle.digest('SHA-256', zipArray);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  await updateArchive(client, {
    orgId,
    engagementId: engagement.id,
    zipDocumentId: pack.zip_document_id!,
    pdfDocumentId: pack.pdf_document_id ?? null,
    sha256,
  });

  const { data, error } = await client
    .from('tcwg_packs')
    .update({ status: 'SENT' as TcwgStatus, updated_by_user_id: user.id })
    .eq('id', pack.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'tcwg_send_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'TCWG_SENT',
    entityId: pack.id,
    metadata: { pdf: pack.pdf_document_id, zip: pack.zip_document_id, shareUrl: signedPdf?.data?.signedUrl ?? null },
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'ARCHIVE_UPDATED_TCWG',
    entityId: pack.id,
    metadata: { sha256 },
  });

  return jsonResponse(200, {
    pack: data,
    shareUrl: signedPdf?.data?.signedUrl ?? null,
    sha256,
  });
}

async function handleGet(client: TypedClient, user: SupabaseUser, url: URL) {
  const orgSlug = url.searchParams.get('orgSlug');
  const engagementId = url.searchParams.get('engagementId');
  const { orgId } = await getOrgContext(client, orgSlug, user.id);
  const engagement = await fetchEngagement(client, orgId, engagementId);
  await assertAcceptance(client, orgId, engagement.id);

  const { data: pack, error } = await client
    .from('tcwg_packs')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new HttpError(500, 'tcwg_get_failed');

  const approvals = pack ? await loadApprovals(client, pack.id, orgId) : [];
  const releasedReport = await fetchReportDraft(client, orgId, engagement.id);
  const reportReleased = releasedReport?.status === 'RELEASED';
  const { data: deficiencies, error: defError } = await client
    .from('deficiencies')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .order('created_at', { ascending: false });
  if (defError) throw new HttpError(500, 'deficiency_lookup_failed');

  let enrichedPack = pack ?? null;
  if (pack) {
    const current = Array.isArray(pack.deficiencies) ? [...(pack.deficiencies as any[])] : [];
    const merged = new Map<string, any>();
    current.forEach((item: any) => {
      const id = typeof item?.id === 'string' ? item.id : crypto.randomUUID();
      merged.set(id, { ...item, id });
    });
    (deficiencies ?? []).forEach((row) => {
      merged.set(row.id, {
        id: row.id,
        controlId: row.control_id,
        severity: row.severity,
        recommendation: row.recommendation,
        status: row.status,
        created_at: row.created_at,
        procedureId: row.procedure_id,
      });
    });
    enrichedPack = { ...pack, deficiencies: Array.from(merged.values()) } as typeof pack;
  }

  return jsonResponse(200, { pack: enrichedPack, approvals, reportReleased, deficiencies: deficiencies ?? [] });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return jsonResponse(401, { error: 'missing_authorization' });

  const client = await createSupabaseClient(authHeader);

  const orgId: string | null = null;
  let orgSlug: string | null = null;
  let engagementId: string | null = null;
  let contextInfo: Record<string, unknown> = {};

  try {
    const user = await getUser(client);
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/audit-tcwg/, '') || '/';
    contextInfo = { pathname, method: req.method };

    if (req.method === 'GET' && pathname === '/get') {
      orgSlug = url.searchParams.get('orgSlug');
      engagementId = url.searchParams.get('engagementId');
      contextInfo = { ...contextInfo, orgSlug, engagementId };
      return await handleGet(client, user, url);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug : url.searchParams.get('orgSlug');
      engagementId = typeof body.engagementId === 'string' ? body.engagementId : body.engagement_id ?? null;
      contextInfo = { ...contextInfo, orgSlug, engagementId, action: pathname };

      if (pathname === '/create') return await handleCreate(client, user, body);
      if (pathname === '/update') return await handleUpdate(client, user, body);
      if (pathname === '/render') return await handleRender(client, user, body);
      if (pathname === '/build-zip') return await handleBuildZip(client, user, body);
      if (pathname === '/submit') return await handleSubmit(client, user, body);
      if (pathname === '/approval/decide') return await handleApprovalDecision(client, user, body);
      if (pathname === '/send') return await handleSend(client, user, body);
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    if (error instanceof HttpError) {
      if (error.status >= 500) {
        await logEdgeError(client, {
          module: 'AUDIT_TCWG',
          message,
          orgSlug,
          orgId,
          context: { ...contextInfo, engagementId },
        });
      }
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-tcwg-unhandled', error);
    await logEdgeError(client, {
      module: 'AUDIT_TCWG',
      message,
      orgSlug,
      orgId,
      context: { ...contextInfo, engagementId },
    });
    return jsonResponse(500, { error: 'internal_error' });
  }
});
