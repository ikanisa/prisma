import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type RefundProfile = Database['public']['Enums']['cit_refund_profile'];
type ApprovalStatus = Database['public']['Enums']['approval_status'];

type SupabaseUser = { id: string; email?: string | null };

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
  return (await createSupabaseClientWithAuth(authHeader)) as TypedClient;
}

async function getUser(client: TypedClient): Promise<SupabaseUser> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'invalid_token');
  return { id: data.user.id, email: data.user.email };
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

async function ensureTaxEntity(client: TypedClient, orgId: string, taxEntityId: string | null) {
  if (!taxEntityId) throw new HttpError(400, 'tax_entity_id_required');
  const { data, error } = await client
    .from('tax_entities')
    .select('id, org_id')
    .eq('id', taxEntityId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'tax_entity_lookup_failed');
  if (!data || data.org_id !== orgId) throw new HttpError(404, 'tax_entity_not_found');
  return data;
}

function computeRefundAmount(citAmount: number, profile: RefundProfile): number {
  switch (profile) {
    case '6_7':
      return citAmount * (6 / 7);
    case '5_7':
      return citAmount * (5 / 7);
    case '2_3':
      return citAmount * (2 / 3);
    case 'NONE':
    default:
      return 0;
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
    entity_type: 'TAX_MT_CIT',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

async function upsertTaxAccountMovement(
  client: TypedClient,
  params: {
    orgId: string;
    taxEntityId: string;
    accountType: Database['public']['Enums']['tax_account_type'];
    amount: number;
    movement: Record<string, unknown>;
  },
) {
  const { data: existing, error: lookupError } = await client
    .from('tax_accounts')
    .select('id, opening_balance, closing_balance, movements')
    .eq('org_id', params.orgId)
    .eq('tax_entity_id', params.taxEntityId)
    .eq('account_type', params.accountType)
    .maybeSingle();
  if (lookupError) throw new HttpError(500, 'tax_account_lookup_failed');

  if (!existing) {
    const { error: insertError } = await client
      .from('tax_accounts')
      .insert({
        org_id: params.orgId,
        tax_entity_id: params.taxEntityId,
        account_type: params.accountType,
        opening_balance: 0,
        closing_balance: params.amount,
        movements: [params.movement],
      });
    if (insertError) throw new HttpError(500, 'tax_account_create_failed');
    return;
  }

  const movements = Array.isArray(existing.movements) ? existing.movements.slice() : [];
  movements.push(params.movement);

  const newClosing = Number(existing.closing_balance ?? 0) + params.amount;

  const { error: updateError } = await client
    .from('tax_accounts')
    .update({ movements, closing_balance: newClosing })
    .eq('id', existing.id);
  if (updateError) throw new HttpError(500, 'tax_account_update_failed');
}

async function handleCompute(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const taxEntity = await ensureTaxEntity(client, orgId, body.taxEntityId ?? null);
  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const preTaxProfit = Number(body.preTaxProfit ?? NaN);
  if (!Number.isFinite(preTaxProfit)) throw new HttpError(400, 'invalid_pre_tax_profit');

  const adjustments: Array<{ label: string; amount: number }> = Array.isArray(body.adjustments)
    ? body.adjustments.map((adj: any) => ({ label: String(adj.label ?? ''), amount: Number(adj.amount ?? 0) }))
    : [];
  const adjustmentsTotal = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

  const participationExempt = Boolean(body.participationExempt);
  const refundProfile = (body.refundProfile as RefundProfile | undefined) ?? 'NONE';

  const chargeableIncome = participationExempt ? 0 : preTaxProfit + adjustmentsTotal;
  const citAmount = participationExempt ? 0 : chargeableIncome * 0.35;
  const refundAmount = participationExempt ? 0 : computeRefundAmount(citAmount, refundProfile);

  const record = {
    org_id: orgId,
    tax_entity_id: taxEntity.id,
    period,
    tb_snapshot_id: body.tbSnapshotId ?? null,
    adjustments,
    pre_tax_profit: preTaxProfit,
    chargeable_income: chargeableIncome,
    cit_amount: citAmount,
    participation_exempt: participationExempt,
    refund_profile: refundProfile,
    refund_amount: refundAmount,
    notes: body.notes ?? null,
    prepared_by_user_id: user.id,
    status: 'DRAFT',
  } satisfies Partial<Database['public']['Tables']['cit_computations']['Insert']>;

  const existing = await client
    .from('cit_computations')
    .select('id')
    .eq('org_id', orgId)
    .eq('tax_entity_id', taxEntity.id)
    .eq('period', period)
    .maybeSingle();

  let computationId: string;
  if (existing.data) {
    const { data, error } = await client
      .from('cit_computations')
      .update(record)
      .eq('id', existing.data.id)
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'cit_update_failed');
    computationId = data.id;
  } else {
    const { data, error } = await client
      .from('cit_computations')
      .insert(record)
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'cit_create_failed');
    computationId = data.id;
  }

  if (!participationExempt) {
    const baseMovement = {
      period,
      direction: 'CHARGE',
      amount: citAmount,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
    await upsertTaxAccountMovement(client, {
      orgId,
      taxEntityId: taxEntity.id,
      accountType: 'MTA',
      amount: citAmount,
      movement: baseMovement,
    });

    if (refundAmount !== 0) {
      const refundMovement = {
        period,
        direction: 'REFUND_ENTITLEMENT',
        amount: -refundAmount,
        userId: user.id,
        createdAt: new Date().toISOString(),
      };
      await upsertTaxAccountMovement(client, {
        orgId,
        taxEntityId: taxEntity.id,
        accountType: 'UA',
        amount: -refundAmount,
        movement: refundMovement,
      });
    }
  }

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'MT_CIT_COMPUTED',
    entityId: computationId,
    metadata: {
      period,
      citAmount,
      refundAmount,
      participationExempt,
    },
  });

  return jsonResponse(200, {
    computationId,
    chargeableIncome,
    citAmount,
    refundAmount,
  });
}

async function handlePrepareReturn(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const taxEntity = await ensureTaxEntity(client, orgId, body.taxEntityId ?? null);
  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const { data: computation, error } = await client
    .from('cit_computations')
    .select('*')
    .eq('org_id', orgId)
    .eq('tax_entity_id', taxEntity.id)
    .eq('period', period)
    .maybeSingle();
  if (error) throw new HttpError(500, 'cit_lookup_failed');
  if (!computation) throw new HttpError(404, 'cit_not_found');

  const schedules = {
    chargeableIncome: computation.chargeable_income,
    citAmount: computation.cit_amount,
    preTaxProfit: computation.pre_tax_profit,
    adjustments: computation.adjustments,
    refundProfile: computation.refund_profile,
    refundAmount: computation.refund_amount,
  };

  const { data: returnFile, error: upsertError } = await client
    .from('return_files')
    .upsert(
      {
        org_id: orgId,
        tax_entity_id: taxEntity.id,
        period,
        kind: 'CIT',
        payload_meta: schedules,
        status: 'DRAFT',
      },
      { onConflict: 'org_id,tax_entity_id,period,kind' },
    )
    .select('id, payload_meta, status')
    .single();
  if (upsertError) throw new HttpError(500, 'return_prepare_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'MT_CIT_RETURN_READY',
    entityId: returnFile.id,
    metadata: { period },
  });

  return jsonResponse(200, { returnFile });
}

async function handleSubmit(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');

  const taxEntity = await ensureTaxEntity(client, orgId, body.taxEntityId ?? null);
  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const { data: computation, error } = await client
    .from('cit_computations')
    .select('id, status')
    .eq('org_id', orgId)
    .eq('tax_entity_id', taxEntity.id)
    .eq('period', period)
    .maybeSingle();
  if (error) throw new HttpError(500, 'cit_lookup_failed');
  if (!computation) throw new HttpError(404, 'cit_not_found');

  if (computation.status === 'READY_FOR_APPROVAL') {
    return jsonResponse(200, { message: 'already_pending' });
  }

  const { error: updateError } = await client
    .from('cit_computations')
    .update({ status: 'READY_FOR_APPROVAL', prepared_at: new Date().toISOString() })
    .eq('id', computation.id);
  if (updateError) throw new HttpError(500, 'cit_submit_failed');

  const { data: approvalRow, error: approvalError } = await client
    .from('approval_queue')
    .insert({
      org_id: orgId,
      engagement_id: body.engagementId ?? null,
      kind: 'MT_CIT_APPROVAL',
      stage: 'PARTNER',
      payload: { taxEntityId: taxEntity.id, period },
      created_by_user_id: user.id,
      updated_by_user_id: user.id,
    })
    .select('id')
    .single();
  if (approvalError) throw new HttpError(500, 'approval_queue_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'MT_CIT_APPROVAL_SUBMITTED',
    entityId: computation.id,
    metadata: { approvalId: approvalRow.id, period },
  });

  return jsonResponse(200, { approvalId: approvalRow.id });
}

async function handleApprove(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'PARTNER');

  const taxEntity = await ensureTaxEntity(client, orgId, body.taxEntityId ?? null);
  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const approvalId = body.approvalId as string | undefined;
  if (!approvalId) throw new HttpError(400, 'approval_id_required');

  const { data: computation, error } = await client
    .from('cit_computations')
    .select('id, status')
    .eq('org_id', orgId)
    .eq('tax_entity_id', taxEntity.id)
    .eq('period', period)
    .maybeSingle();
  if (error) throw new HttpError(500, 'cit_lookup_failed');
  if (!computation || computation.status !== 'READY_FOR_APPROVAL') {
    throw new HttpError(409, 'cit_not_pending');
  }

  const decision = (body.decision as ApprovalStatus | undefined) ?? 'APPROVED';
  const note = body.note as string | undefined;

  const { error: queueError } = await client
    .from('approval_queue')
    .update({
      status: decision,
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: user.id,
      resolution_note: note ?? null,
    })
    .eq('id', approvalId)
    .eq('org_id', orgId);
  if (queueError) throw new HttpError(500, 'approval_update_failed');

  if (decision === 'REJECTED') {
    const { error: resetError } = await client
      .from('cit_computations')
      .update({ status: 'DRAFT' })
      .eq('id', computation.id);
    if (resetError) throw new HttpError(500, 'cit_reset_failed');

    await logActivity(client, {
      orgId,
      userId: user.id,
      action: 'MT_CIT_APPROVAL_REJECTED',
      entityId: computation.id,
      metadata: { approvalId },
    });

    return jsonResponse(200, { status: 'REJECTED' });
  }

  const { error: statusError } = await client
    .from('cit_computations')
    .update({ status: 'APPROVED' })
    .eq('id', computation.id);
  if (statusError) throw new HttpError(500, 'cit_approve_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'MT_CIT_APPROVED',
    entityId: computation.id,
    metadata: { approvalId },
  });

  return jsonResponse(200, { status: 'APPROVED' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'missing_auth_header');
    const client = await createSupabaseClient(authHeader);
    const user = await getUser(client);

    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/tax-mt-cit/, '') || '/';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (pathname === '/compute') return await handleCompute(client, user, body);
      if (pathname === '/prepare-return') return await handlePrepareReturn(client, user, body);
      if (pathname === '/submit') return await handleSubmit(client, user, body);
      if (pathname === '/approve') return await handleApprove(client, user, body);
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('tax-mt-cit-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
