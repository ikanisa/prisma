import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { logEdgeError } from '../_shared/error-notify.ts';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];

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

const handleOptions = (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

const createSupabaseClient = async (authHeader: string) =>
  createSupabaseClientWithAuth<Database>(authHeader);

const getUser = async (client: TypedClient) => {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'invalid_token');
  return data.user;
};

const getOrgContext = async (client: TypedClient, orgSlug: string | null, userId: string) => {
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
};

const requireRole = (role: RoleLevel, minimum: RoleLevel) => {
  if (roleRank[role] < roleRank[minimum]) {
    throw new HttpError(403, 'insufficient_role');
  }
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const logActivity = async (
  client: TypedClient,
  params: { orgId: string; userId: string; action: string; entityId: string; metadata?: Record<string, unknown> },
) => {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: 'ARCHIVE',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_insert_failed', error);
};

serve(async (request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'missing_authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const client = await createSupabaseClient(authHeader);

  let orgId: string | null = null;
  let orgSlug: string | null = null;
  let engagementId: string | null = null;
  let contextInfo: Record<string, unknown> | undefined;

  try {
    const user = await getUser(client);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug : null;
    engagementId = typeof body.engagementId === 'string' ? body.engagementId : null;
    if (!engagementId) throw new HttpError(400, 'engagement_id_required');

    const context = await getOrgContext(client, orgSlug, user.id);
    orgId = context.orgId;
    requireRole(context.role, 'MANAGER');
    contextInfo = { engagementId };

    const { data: engagement, error: engagementError } = await client
      .from('engagements')
      .select('id, client_id')
      .eq('org_id', orgId)
      .eq('id', engagementId)
      .maybeSingle();
    if (engagementError) throw new HttpError(500, 'engagement_lookup_failed');
    if (!engagement) throw new HttpError(404, 'engagement_not_found');

    const [acceptanceDecision, tcwgPack, modules] = await Promise.all([
      client
        .from('acceptance_decisions')
        .select('id, decision, status, eqr_required, approved_at, updated_at')
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId)
        .maybeSingle(),
      client
        .from('tcwg_packs')
        .select('id, status, pdf_document_id, zip_document_id, approved_at, eqr_approved_at, updated_at')
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from('audit_module_records')
        .select('module_code, record_status, approval_state, updated_at')
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId),
    ]);

    if (acceptanceDecision.error) throw new HttpError(500, 'acceptance_lookup_failed');
    if (tcwgPack.error) throw new HttpError(500, 'tcwg_lookup_failed');
    if (modules.error) throw new HttpError(500, 'module_lookup_failed');

    const acceptance = acceptanceDecision.data
      ? {
          id: acceptanceDecision.data.id,
          decision: acceptanceDecision.data.decision,
          status: acceptanceDecision.data.status,
          eqrRequired: acceptanceDecision.data.eqr_required,
          approvedAt: acceptanceDecision.data.approved_at,
          updatedAt: acceptanceDecision.data.updated_at,
        }
      : null;

    const tcwg = tcwgPack.data
      ? {
          id: tcwgPack.data.id,
          status: tcwgPack.data.status,
          pdfDocumentId: tcwgPack.data.pdf_document_id,
          zipDocumentId: tcwgPack.data.zip_document_id,
          approvedAt: tcwgPack.data.approved_at,
          eqrApprovedAt: tcwgPack.data.eqr_approved_at,
          updatedAt: tcwgPack.data.updated_at,
        }
      : null;

    const moduleSummaries = (modules.data ?? []).map((record) => ({
      moduleCode: record.module_code,
      status: record.record_status,
      approvalState: record.approval_state,
      updatedAt: record.updated_at,
    }));

    const manifest = {
      engagementId,
      generatedAt: new Date().toISOString(),
      acceptance,
      tcwg,
      modules: moduleSummaries,
    };

    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(manifest)));
    const sha256 = toHex(digest);

    const { error: upsertError, data: archive } = await client
      .from('engagement_archives')
      .upsert(
        {
          org_id: orgId,
          engagement_id: engagementId,
          manifest,
          sha256,
        },
        { onConflict: 'engagement_id' },
      )
      .select('id')
      .maybeSingle();

    if (upsertError) throw new HttpError(500, 'archive_upsert_failed');

    await logActivity(client, {
      orgId,
      userId: user.id,
      action: 'ARCHIVE_MANIFEST_UPDATED',
      entityId: archive?.id ?? engagementId,
      metadata: { engagementId, sha256 },
    });

    return new Response(JSON.stringify({ manifest, sha256 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    if (error instanceof HttpError) {
      if (error.status >= 500) {
        await logEdgeError(client, {
          module: 'ARCHIVE_SYNC',
          message,
          orgId,
          orgSlug,
          context: contextInfo,
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.error('archive-sync error', error);
    await logEdgeError(client, {
      module: 'ARCHIVE_SYNC',
      message,
      orgId,
      orgSlug,
      context: contextInfo,
    });
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
