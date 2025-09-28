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
  return createSupabaseClientWithAuth<Database>(authHeader);
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

async function logActivity(
  client: TypedClient,
  params: { orgId: string; userId: string; action: string; entityId: string | null; metadata?: Record<string, unknown> },
) {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: 'ACCOUNTING_CLOSE',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

/** ACCOUNT IMPORT **/
async function handleAccountsImport(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const rows: Array<{ code: string; name: string; type: string; currency?: string; entityId?: string | null }>
    = Array.isArray(body.accounts) ? body.accounts : [];
  if (!rows.length) throw new HttpError(400, 'accounts_required');

  const payload = rows.map((row) => ({
    org_id: orgId,
    entity_id: row.entityId ?? null,
    code: row.code,
    name: row.name,
    type: row.type,
    currency: row.currency ?? 'EUR',
  }));

  const { error } = await client
    .from('ledger_accounts')
    .upsert(payload, { onConflict: 'org_id,entity_id,code' });
  if (error) throw new HttpError(500, 'accounts_upsert_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'GL_ACCOUNTS_IMPORTED',
    entityId: null,
    metadata: { count: payload.length },
  });

  return jsonResponse(200, { imported: payload.length });
}

/** LEDGER ENTRIES IMPORT **/
async function handleEntriesImport(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (!entries.length) throw new HttpError(400, 'entries_required');

  const payload = entries.map((row) => ({
    org_id: orgId,
    entity_id: row.entityId ?? null,
    period_id: row.periodId ?? null,
    entry_date: row.date ?? new Date().toISOString().slice(0, 10),
    account_id: row.accountId,
    description: row.description ?? null,
    debit: Number(row.debit ?? 0),
    credit: Number(row.credit ?? 0),
    currency: row.currency ?? 'EUR',
    fx_rate: row.fxRate ?? null,
    source: row.source ?? 'IMPORT',
    batch_id: row.batchId ?? null,
    created_by_user_id: user.id,
  }));

  const { error } = await client.from('ledger_entries').insert(payload);
  if (error) throw new HttpError(500, 'entries_insert_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'GL_ENTRIES_IMPORTED',
    entityId: null,
    metadata: { count: payload.length },
  });

  return jsonResponse(200, { inserted: payload.length });
}

/** JOURNAL BATCH OPERATIONS **/
async function ensureBatch(client: TypedClient, orgId: string, batchId: string | null) {
  if (!batchId) throw new HttpError(400, 'batch_id_required');
  const { data, error } = await client
    .from('journal_batches')
    .select('id, status')
    .eq('id', batchId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'batch_lookup_failed');
  if (!data) throw new HttpError(404, 'batch_not_found');
  return data;
}

async function handleJournalCreate(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const { data, error } = await client
    .from('journal_batches')
    .insert({
      org_id: orgId,
      entity_id: body.entityId ?? null,
      period_id: body.periodId ?? null,
      reference: body.reference ?? null,
      prepared_by_user_id: user.id,
    })
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'batch_create_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'JE_BATCH_CREATED',
    entityId: data.id,
    metadata: { reference: body.reference ?? null },
  });

  return jsonResponse(200, { batchId: data.id });
}

async function handleJournalAddLines(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const batch = await ensureBatch(client, orgId, body.batchId ?? null);
  if (batch.status !== 'DRAFT') throw new HttpError(409, 'batch_not_editable');

  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (!lines.length) throw new HttpError(400, 'lines_required');

  let totalDebit = 0;
  let totalCredit = 0;
  const payload = lines.map((line) => {
    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    totalDebit += debit;
    totalCredit += credit;
    return {
      org_id: orgId,
      entity_id: line.entityId ?? null,
      period_id: batch.period_id,
      entry_date: line.date ?? new Date().toISOString().slice(0, 10),
      account_id: line.accountId,
      description: line.description ?? null,
      debit,
      credit,
      currency: line.currency ?? 'EUR',
      fx_rate: line.fxRate ?? null,
      source: 'JOURNAL',
      batch_id: batch.id,
      created_by_user_id: user.id,
    };
  });

  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new HttpError(400, 'journal_not_balanced');
  }

  const { error } = await client.from('ledger_entries').insert(payload);
  if (error) throw new HttpError(500, 'journal_lines_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'JE_LINES_ADDED',
    entityId: batch.id,
    metadata: { count: payload.length, totalDebit, totalCredit },
  });

  return jsonResponse(200, { linesInserted: payload.length });
}

async function createJeControlAlerts(
  client: TypedClient,
  orgId: string,
  entityId: string | null,
  periodId: string | null,
  batchId: string,
  rules: Array<{ rule: Database['public']['Enums']['je_control_rule']; severity: Database['public']['Enums']['je_control_severity']; details: Record<string, unknown> }>,
) {
  if (!rules.length) return;
  const payload = rules.map((rule) => ({
    org_id: orgId,
    entity_id: entityId,
    period_id: periodId,
    batch_id: batchId,
    rule: rule.rule,
    severity: rule.severity,
    details: rule.details,
  }));
  const { error } = await client.from('je_control_alerts').insert(payload);
  if (error) console.error('je_control_alert_error', error);
}

async function handleJournalSubmit(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const batch = await ensureBatch(client, orgId, body.batchId ?? null);
  if (batch.status !== 'DRAFT') throw new HttpError(409, 'batch_not_editable');

  const { data: lines, error: lineError } = await client
    .from('ledger_entries')
    .select('entry_date, debit, credit, description')
    .eq('batch_id', batch.id);
  if (lineError) throw new HttpError(500, 'journal_lines_lookup_failed');
  if (!lines || !lines.length) throw new HttpError(409, 'no_lines_to_submit');

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new HttpError(400, 'journal_not_balanced');
  }

  const alerts: Array<{ rule: Database['public']['Enums']['je_control_rule']; severity: Database['public']['Enums']['je_control_severity']; details: Record<string, unknown> }> = [];
  const submitDate = new Date();
  const weekend = submitDate.getUTCDay() === 0 || submitDate.getUTCDay() === 6;
  if (weekend) {
    alerts.push({ rule: 'WEEKEND_USER', severity: 'LOW', details: { submittedAt: submitDate.toISOString() } });
  }
  if (lines.some((line) => Math.abs(Number(line.debit ?? 0)) >= 1000 && Number(line.debit ?? 0) % 1000 === 0)) {
    alerts.push({ rule: 'ROUND_AMOUNT', severity: 'MEDIUM', details: { threshold: 1000 } });
  }

  await createJeControlAlerts(client, orgId, batch.entity_id ?? null, batch.period_id ?? null, batch.id, alerts);

  const { error: updateError } = await client
    .from('journal_batches')
    .update({ status: 'SUBMITTED', submitted_at: submitDate.toISOString() })
    .eq('id', batch.id);
  if (updateError) throw new HttpError(500, 'batch_submit_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'JE_SUBMITTED',
    entityId: batch.id,
    metadata: { alerts: alerts.length },
  });

  return jsonResponse(200, { batchId: batch.id, alerts: alerts.length });
}

async function handleJournalApprove(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');

  const batch = await ensureBatch(client, orgId, body.batchId ?? null);
  if (batch.status !== 'SUBMITTED') throw new HttpError(409, 'batch_not_submitted');

  const { data: alerts, error } = await client
    .from('je_control_alerts')
    .select('id, severity')
    .eq('batch_id', batch.id)
    .eq('resolved', false);
  if (error) throw new HttpError(500, 'alerts_lookup_failed');
  const unresolvedHigh = (alerts ?? []).some((alert) => alert.severity === 'HIGH');
  if (unresolvedHigh) throw new HttpError(409, 'high_alerts_unresolved');

  const { error: updateError } = await client
    .from('journal_batches')
    .update({ status: 'APPROVED', approved_at: new Date().toISOString(), approved_by_user_id: user.id })
    .eq('id', batch.id);
  if (updateError) throw new HttpError(500, 'batch_approve_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'JE_APPROVED',
    entityId: batch.id,
  });

  return jsonResponse(200, { status: 'APPROVED' });
}

async function handleJournalPost(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');

  const batch = await ensureBatch(client, orgId, body.batchId ?? null);
  if (batch.status !== 'APPROVED') throw new HttpError(409, 'batch_not_approved');

  const { error } = await client
    .from('journal_batches')
    .update({ status: 'POSTED', posted_at: new Date().toISOString() })
    .eq('id', batch.id);
  if (error) throw new HttpError(500, 'batch_post_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'JE_POSTED',
    entityId: batch.id,
  });

  return jsonResponse(200, { status: 'POSTED' });
}

/** RECONCILIATION **/
async function handleReconciliationCreate(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const glBalance = Number(body.glBalance ?? 0);
  const externalBalance = Number(body.externalBalance ?? 0);

  const { data, error } = await client
    .from('reconciliations')
    .insert({
      org_id: orgId,
      entity_id: body.entityId ?? null,
      period_id: body.periodId ?? null,
      type: body.type ?? 'BANK',
      control_account_id: body.controlAccountId ?? null,
      gl_balance: glBalance,
      external_balance: externalBalance,
      difference: glBalance - externalBalance,
      prepared_by_user_id: user.id,
    })
    .select('id, difference')
    .single();
  if (error) throw new HttpError(500, 'reconciliation_create_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'RECON_CREATED',
    entityId: data.id,
    metadata: { difference: data.difference },
  });

  return jsonResponse(200, { reconciliationId: data.id, difference: data.difference });
}

async function handleReconciliationAddItem(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const reconciliationId = body.reconciliationId as string | undefined;
  if (!reconciliationId) throw new HttpError(400, 'reconciliation_id_required');

  const { data: reconciliation, error: reconError } = await client
    .from('reconciliations')
    .select('id, org_id, difference')
    .eq('id', reconciliationId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (reconError) throw new HttpError(500, 'reconciliation_lookup_failed');
  if (!reconciliation) throw new HttpError(404, 'reconciliation_not_found');

  const amount = Number(body.amount ?? NaN);
  if (!Number.isFinite(amount)) throw new HttpError(400, 'invalid_amount');

  const { error } = await client
    .from('reconciliation_items')
    .insert({
      org_id: orgId,
      reconciliation_id: reconciliation.id,
      category: body.category ?? 'OTHER',
      amount,
      reference: body.reference ?? null,
      resolved: Boolean(body.resolved),
      note: body.note ?? null,
    });
  if (error) throw new HttpError(500, 'reconciliation_item_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'RECON_ITEM_ADDED',
    entityId: reconciliation.id,
    metadata: { amount },
  });

  return jsonResponse(200, { success: true });
}

async function handleReconciliationClose(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');

  const reconciliationId = body.reconciliationId as string | undefined;
  if (!reconciliationId) throw new HttpError(400, 'reconciliation_id_required');

  const { data: reconciliation, error } = await client
    .from('reconciliations')
    .select('id, difference, status')
    .eq('id', reconciliationId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'reconciliation_lookup_failed');
  if (!reconciliation) throw new HttpError(404, 'reconciliation_not_found');

  if (Math.abs(Number(reconciliation.difference ?? 0)) > 0.01) {
    throw new HttpError(409, 'difference_not_zero');
  }

  const { error: updateError } = await client
    .from('reconciliations')
    .update({ status: 'CLOSED', closed_at: new Date().toISOString(), reviewed_by_user_id: user.id })
    .eq('id', reconciliation.id);
  if (updateError) throw new HttpError(500, 'reconciliation_close_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'RECON_CLOSED',
    entityId: reconciliation.id,
  });

  return jsonResponse(200, { status: 'CLOSED' });
}

/** TRIAL BALANCE SNAPSHOT **/
async function handleTBSnapshot(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const periodId = body.periodId as string | undefined;
  const entityId = body.entityId as string | null ?? null;

  const query = client
    .from('ledger_entries')
    .select('account_id, debit, credit')
    .eq('org_id', orgId);
  if (entityId) query.eq('entity_id', entityId);
  if (periodId) query.eq('period_id', periodId);

  const { data: entries, error } = await query;
  if (error) throw new HttpError(500, 'ledger_entries_lookup_failed');

  const balances: Record<string, number> = {};
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries ?? []) {
    const accountId = entry.account_id;
    const debit = Number(entry.debit ?? 0);
    const credit = Number(entry.credit ?? 0);
    balances[accountId] = (balances[accountId] ?? 0) + debit - credit;
    totalDebit += debit;
    totalCredit += credit;
  }

  const { data, error: insertError } = await client
    .from('trial_balance_snapshots')
    .insert({
      org_id: orgId,
      entity_id: entityId,
      period_id: periodId ?? null,
      snapshot_at: new Date().toISOString(),
      total_debits: totalDebit,
      total_credits: totalCredit,
      balances,
      locked: Boolean(body.lock ?? false),
    })
    .select('id')
    .single();
  if (insertError) throw new HttpError(500, 'tb_snapshot_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'TB_SNAPSHOTTED',
    entityId: data.id,
    metadata: { totalDebit, totalCredit },
  });

  return jsonResponse(200, { snapshotId: data.id, totalDebit, totalCredit });
}

/** VARIANCE RUN **/
async function handleVarianceRun(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const periodId = body.periodId as string | undefined;
  const { data: rules, error } = await client
    .from('variance_rules')
    .select('id, target_code, method, threshold_abs, threshold_pct')
    .eq('org_id', orgId)
    .eq('active', true);
  if (error) throw new HttpError(500, 'variance_rule_lookup_failed');

  const results = [] as Array<{ rule_id: string; target_code: string; value: number; baseline: number; delta_abs: number; delta_pct: number; status: string }>;
  for (const rule of rules ?? []) {
    const value = Number(body.values?.[rule.target_code] ?? 0);
    const baseline = Number(body.baseline?.[rule.target_code] ?? 0);
    const deltaAbs = value - baseline;
    const deltaPct = baseline === 0 ? 0 : (deltaAbs / Math.abs(baseline)) * 100;
    const absExceeded = rule.threshold_abs != null && Math.abs(deltaAbs) >= Number(rule.threshold_abs);
    const pctExceeded = rule.threshold_pct != null && Math.abs(deltaPct) >= Number(rule.threshold_pct);
    const triggered = rule.method === 'BOTH' ? absExceeded && pctExceeded : rule.method === 'ABS' ? absExceeded : pctExceeded;
    if (triggered) {
      results.push({
        rule_id: rule.id,
        target_code: rule.target_code,
        value,
        baseline,
        delta_abs: deltaAbs,
        delta_pct: deltaPct,
        status: 'OPEN',
      });
    }
  }

  if (results.length) {
    const payload = results.map((row) => ({
      org_id: orgId,
      entity_id: body.entityId ?? null,
      period_id: periodId ?? null,
      rule_id: row.rule_id,
      target_code: row.target_code,
      value: row.value,
      baseline: row.baseline,
      delta_abs: row.delta_abs,
      delta_pct: row.delta_pct,
      status: row.status,
    }));
    const { error: insertError } = await client.from('variance_results').insert(payload);
    if (insertError) throw new HttpError(500, 'variance_insert_failed');
  }

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'VARIANCE_RUN',
    entityId: null,
    metadata: { triggered: results.length },
  });

  return jsonResponse(200, { triggered: results.length });
}

/** PBC TEMPLATE INSTANTIATE **/
async function handlePbcInstantiate(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) throw new HttpError(400, 'items_required');
  const periodId = body.periodId as string | undefined;

  const payload = items.map((item: any) => ({
    org_id: orgId,
    entity_id: body.entityId ?? null,
    period_id: periodId ?? null,
    area: body.area ?? 'OTHER',
    title: item.title ?? 'PBC Item',
    assignee_user_id: item.assigneeUserId ?? null,
    due_at: item.dueAt ?? null,
    status: 'REQUESTED',
  }));

  const { data, error } = await client
    .from('close_pbc_items')
    .insert(payload)
    .select('id')
    .limit(1);
  if (error) throw new HttpError(500, 'pbc_instantiate_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'PBC_INSTANTIATED',
    entityId: data?.[0]?.id ?? null,
    metadata: { count: payload.length },
  });

  return jsonResponse(200, { inserted: payload.length });
}

/** CLOSE PERIOD ADVANCE & LOCK **/
async function handleCloseAdvance(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');

  const closeId = body.closePeriodId as string | undefined;
  if (!closeId) throw new HttpError(400, 'close_period_id_required');

  const { data: close, error } = await client
    .from('close_periods')
    .select('id, status')
    .eq('id', closeId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'close_lookup_failed');
  if (!close) throw new HttpError(404, 'close_period_not_found');

  const transitions: Record<string, string> = {
    OPEN: 'SUBSTANTIVE_REVIEW',
    SUBSTANTIVE_REVIEW: 'READY_TO_LOCK',
    READY_TO_LOCK: 'READY_TO_LOCK',
    LOCKED: 'LOCKED',
  };
  const nextStatus = transitions[close.status as keyof typeof transitions] ?? 'OPEN';
  if (close.status === 'LOCKED') {
    return jsonResponse(200, { status: 'LOCKED' });
  }

  const { error: updateError } = await client
    .from('close_periods')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', close.id);
  if (updateError) throw new HttpError(500, 'close_advance_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'CLOSE_ADVANCED',
    entityId: close.id,
    metadata: { from: close.status, to: nextStatus },
  });

  return jsonResponse(200, { status: nextStatus });
}

async function handleCloseLock(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'PARTNER');

  const closeId = body.closePeriodId as string | undefined;
  if (!closeId) throw new HttpError(400, 'close_period_id_required');

  const { data: close, error } = await client
    .from('close_periods')
    .select('id, status, entity_id')
    .eq('id', closeId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'close_lookup_failed');
  if (!close) throw new HttpError(404, 'close_period_not_found');
  if (close.status !== 'READY_TO_LOCK') throw new HttpError(409, 'close_not_ready');

  const { data: openPbc } = await client
    .from('close_pbc_items')
    .select('id')
    .eq('period_id', close.id)
    .eq('org_id', orgId)
    .not('status', 'in', '(APPROVED,OBSOLETE)');
  if ((openPbc ?? []).length) throw new HttpError(409, 'pbc_outstanding');

  const { data: openRecon } = await client
    .from('reconciliations')
    .select('id')
    .eq('period_id', close.id)
    .eq('org_id', orgId)
    .neq('status', 'CLOSED');
  if ((openRecon ?? []).length) throw new HttpError(409, 'recons_outstanding');

  const { data: openVariances } = await client
    .from('variance_results')
    .select('id')
    .eq('period_id', close.id)
    .eq('org_id', orgId)
    .eq('status', 'OPEN');
  if ((openVariances ?? []).length) throw new HttpError(409, 'variances_unresolved');

  const { data: pendingBatches } = await client
    .from('journal_batches')
    .select('id')
    .eq('org_id', orgId)
    .eq('period_id', close.id)
    .neq('status', 'POSTED');
  if ((pendingBatches ?? []).length) throw new HttpError(409, 'journals_pending');

  const { error: updateError } = await client
    .from('close_periods')
    .update({ status: 'LOCKED', locked_at: new Date().toISOString(), locked_by_user_id: user.id })
    .eq('id', close.id);
  if (updateError) throw new HttpError(500, 'close_lock_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'CLOSE_LOCKED',
    entityId: close.id,
  });

  return jsonResponse(200, { status: 'LOCKED' });
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
    const pathname = url.pathname.replace(/^\/accounting-close/, '') || '/';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (pathname === '/accounts/import') return await handleAccountsImport(client, user, body);
      if (pathname === '/entries/import') return await handleEntriesImport(client, user, body);
      if (pathname === '/journal/create') return await handleJournalCreate(client, user, body);
      if (pathname === '/journal/add-lines') return await handleJournalAddLines(client, user, body);
      if (pathname === '/journal/submit') return await handleJournalSubmit(client, user, body);
      if (pathname === '/journal/approve') return await handleJournalApprove(client, user, body);
      if (pathname === '/journal/post') return await handleJournalPost(client, user, body);
      if (pathname === '/recon/create') return await handleReconciliationCreate(client, user, body);
      if (pathname === '/recon/add-item') return await handleReconciliationAddItem(client, user, body);
      if (pathname === '/recon/close') return await handleReconciliationClose(client, user, body);
      if (pathname === '/tb/snapshot') return await handleTBSnapshot(client, user, body);
      if (pathname === '/variance/run') return await handleVarianceRun(client, user, body);
      if (pathname === '/pbc/instantiate') return await handlePbcInstantiate(client, user, body);
      if (pathname === '/close/advance') return await handleCloseAdvance(client, user, body);
      if (pathname === '/close/lock') return await handleCloseLock(client, user, body);
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('accounting-close-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
