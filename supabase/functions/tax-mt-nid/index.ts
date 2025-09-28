import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import {
  calculateNid,
  calculatePatentBox,
  calculateInterestLimitation,
  calculateCfcInclusion,
  calculateFiscalUnity,
  calculateVatReturn,
  calculatePillarTwo,
  calculateTreatyWht,
  calculateUsOverlay,
} from '../../../src/lib/tax/calculators.ts';
import { logEdgeError } from '../_shared/error-notify.ts';
import { assessDac6 } from '../../../src/lib/tax/dac6.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type TaxDisputeStatus = Database['public']['Enums']['tax_dispute_status'];
type SupabaseUser = { id: string; email?: string | null };

const roleRank: Record<RoleLevel, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  SYSTEM_ADMIN: 3,
};

const disputeStatuses: TaxDisputeStatus[] = ['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'RESOLVED', 'CLOSED'];
const disputeStatusSet = new Set(disputeStatuses);
const disputeCaseTypes = new Set(['MAP', 'APA']);
const usOverlayTypes = new Set(['GILTI', '163J', 'CAMT', 'EXCISE_4501']);
const usOverlayActivityMap: Record<string, 'US_GILTI_COMPUTED' | 'US_163J_COMPUTED' | 'US_CAMT_COMPUTED' | 'US_4501_COMPUTED'> = {
  GILTI: 'US_GILTI_COMPUTED',
  '163J': 'US_163J_COMPUTED',
  CAMT: 'US_CAMT_COMPUTED',
  EXCISE_4501: 'US_4501_COMPUTED',
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(status: number, body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function handleOptions(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
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

function normaliseMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

const toIsoDate = (value: unknown, fallback?: Date) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  const base = fallback ?? new Date();
  return base.toISOString().slice(0, 10);
};

async function logActivity(
  client: TypedClient,
  params: { orgId: string; userId: string; action: string; entityId: string; metadata?: Record<string, unknown> },
) {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: 'TAX_MT_CALC',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

async function handleNidCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);

  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const equityBase = Number(body.equityBase ?? NaN);
  if (!Number.isFinite(equityBase)) throw new HttpError(400, 'invalid_equity_base');

  const input = {
    equityBase,
    riskFreeRate: Number(body.riskFreeRate ?? 0),
    riskPremium: Number(body.riskPremium ?? 0.05),
    referenceRateOverride: Number(body.referenceRateOverride ?? NaN),
    priorDeduction: Number(body.priorDeduction ?? 0),
    chargeableIncomeBeforeNid: Number(body.chargeableIncomeBeforeNid ?? NaN),
    capRatio: Number(body.capRatio ?? 0.9),
  };

  const result = calculateNid(input);

  const { data: record, error } = await client
    .from('nid_computations')
    .insert({
      org_id: auth.orgId,
      tax_entity_id: taxEntity.id,
      period,
      equity_base: equityBase,
      risk_free_rate: Number.isFinite(input.riskFreeRate) ? input.riskFreeRate : 0,
      risk_premium: Number.isFinite(input.riskPremium) ? input.riskPremium : 0.05,
      reference_rate: result.referenceRate,
      prior_deduction: Number.isFinite(input.priorDeduction) ? Math.max(Number(input.priorDeduction), 0) : 0,
      chargeable_income_before_nid: Number.isFinite(input.chargeableIncomeBeforeNid)
        ? Number(input.chargeableIncomeBeforeNid)
        : null,
      cap_ratio: Number.isFinite(input.capRatio) ? Number(input.capRatio) : 0.9,
      gross_deduction: result.grossDeduction,
      capped_deduction: result.cappedDeduction,
      deduction_after_carryforward: result.deductionAfterCarryforward,
      adjustment_amount: result.adjustmentAmount,
      notes: typeof body.notes === 'string' ? body.notes : null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !record) {
    throw new HttpError(500, error?.message ?? 'nid_insert_failed');
  }

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'MT_NID_COMPUTED',
    entityId: record.id,
    metadata: {
      period,
      taxEntityId: taxEntity.id,
      adjustmentAmount: result.adjustmentAmount,
    },
  });

  return { record, result };
}

async function handlePatentBoxCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);

  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const qualifyingIpIncome = Number(body.qualifyingIpIncome ?? NaN);
  const qualifyingExpenditure = Number(body.qualifyingExpenditure ?? NaN);
  const overallExpenditure = Number(body.overallExpenditure ?? NaN);

  if (!Number.isFinite(qualifyingIpIncome)) throw new HttpError(400, 'invalid_qualifying_ip_income');
  if (!Number.isFinite(qualifyingExpenditure)) throw new HttpError(400, 'invalid_qualifying_expenditure');
  if (!Number.isFinite(overallExpenditure) || overallExpenditure <= 0) {
    throw new HttpError(400, 'invalid_overall_expenditure');
  }

  const input = {
    qualifyingIpIncome,
    qualifyingExpenditure,
    overallExpenditure,
    routineReturnRate: Number(body.routineReturnRate ?? 0.1),
    upliftCap: Number(body.upliftCap ?? 0.3),
    deductionRate: Number(body.deductionRate ?? 0.95),
  };

  const result = calculatePatentBox(input);

  const { data: record, error } = await client
    .from('patent_box_computations')
    .insert({
      org_id: auth.orgId,
      tax_entity_id: taxEntity.id,
      period,
      qualifying_ip_income: qualifyingIpIncome,
      qualifying_expenditure: qualifyingExpenditure,
      overall_expenditure: overallExpenditure,
      routine_return_rate: input.routineReturnRate,
      uplift_cap: input.upliftCap,
      deduction_rate: input.deductionRate,
      routine_return: result.routineReturn,
      uplift: result.uplift,
      nexus_fraction: result.nexusFraction,
      deduction_base: result.deductionBase,
      deduction_amount: result.deductionAmount,
      adjustment_amount: result.adjustmentAmount,
      notes: typeof body.notes === 'string' ? body.notes : null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !record) {
    throw new HttpError(500, error?.message ?? 'patent_box_insert_failed');
  }

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'MT_PATENT_BOX_COMPUTED',
    entityId: record.id,
    metadata: {
      period,
      taxEntityId: taxEntity.id,
      adjustmentAmount: result.adjustmentAmount,
    },
  });

  return { record, result };
}

async function handleInterestLimitationCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);
  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const ebc = Number(body.exceedingBorrowingCosts ?? NaN);
  const taxEbitda = Number(body.taxEbitda ?? NaN);
  if (!Number.isFinite(ebc)) throw new HttpError(400, 'invalid_exceeding_borrowing_costs');
  if (!Number.isFinite(taxEbitda)) throw new HttpError(400, 'invalid_tax_ebitda');

  const result = calculateInterestLimitation({
    exceedingBorrowingCosts: ebc,
    taxEbitda,
    standaloneAllowance: body.standaloneAllowance ? Number(body.standaloneAllowance) : undefined,
    safeHarbourAmount: body.safeHarbourAmount ? Number(body.safeHarbourAmount) : undefined,
    carryforwardInterest: body.carryforwardInterest ? Number(body.carryforwardInterest) : undefined,
    carryforwardCapacity: body.carryforwardCapacity ? Number(body.carryforwardCapacity) : undefined,
    disallowedCarryforward: body.disallowedCarryforward ? Number(body.disallowedCarryforward) : undefined,
  });

  const { data: record, error } = await client
    .from('interest_limitation_computations')
    .insert({
      org_id: auth.orgId,
      tax_entity_id: taxEntity.id,
      period,
      exceeding_borrowing_costs: ebc,
      tax_ebitda: taxEbitda,
      standalone_allowance: Number(body.standaloneAllowance ?? 0),
      safe_harbour_amount: Number(body.safeHarbourAmount ?? 3_000_000),
      carryforward_interest: Number(body.carryforwardInterest ?? 0),
      carryforward_capacity: Number(body.carryforwardCapacity ?? 0),
      disallowed_carryforward: Number(body.disallowedCarryforward ?? 0),
      allowed_interest: result.allowedInterest,
      disallowed_interest: result.disallowedInterest,
      updated_carryforward_interest: result.updatedCarryforwardInterest,
      updated_carryforward_capacity: result.updatedCarryforwardCapacity,
      adjustment_amount: result.adjustmentAmount,
      notes: typeof body.notes === 'string' ? body.notes : null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !record) throw new HttpError(500, error?.message ?? 'ilr_insert_failed');

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'MT_ILR_COMPUTED',
    entityId: record.id,
    metadata: {
      period,
      taxEntityId: taxEntity.id,
      adjustmentAmount: result.adjustmentAmount,
    },
  });

  return { record, result };
}

async function handleCfcCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);
  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const profit = Number(body.cfcProfit ?? NaN);
  if (!Number.isFinite(profit)) throw new HttpError(400, 'invalid_cfc_profit');

  const result = calculateCfcInclusion({
    cfcProfit: profit,
    foreignTaxPaid: Number(body.foreignTaxPaid ?? 0),
    foreignJurisdictionRate: body.foreignRate ? Number(body.foreignRate) : undefined,
    domesticRate: body.domesticRate ? Number(body.domesticRate) : undefined,
    participationPercentage: Number(body.participationPercentage ?? 1),
    profitAttributionRatio: body.profitAttributionRatio ? Number(body.profitAttributionRatio) : undefined,
  });

  const { data: record, error } = await client
    .from('cfc_inclusions')
    .insert({
      org_id: auth.orgId,
      tax_entity_id: taxEntity.id,
      period,
      cfc_entity_name: typeof body.cfcEntityName === 'string' ? body.cfcEntityName : null,
      cfc_profit: profit,
      foreign_tax_paid: Number(body.foreignTaxPaid ?? 0),
      foreign_rate: result.effectiveForeignRate,
      domestic_rate: result.domesticRate,
      participation_percentage: Number(body.participationPercentage ?? 1),
      profit_attribution_ratio: Number(body.profitAttributionRatio ?? 1),
      inclusion_amount: result.inclusionAmount,
      tax_credit_eligible: result.taxCreditEligible,
      adjustment_amount: result.adjustmentAmount,
      notes: typeof body.notes === 'string' ? body.notes : null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !record) throw new HttpError(500, error?.message ?? 'cfc_insert_failed');

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'MT_CFC_COMPUTED',
    entityId: record.id,
    metadata: {
      period,
      taxEntityId: taxEntity.id,
      inclusionAmount: result.inclusionAmount,
    },
  });

  return { record, result };
}

async function handleFiscalUnityCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const parentTaxEntityId = String(body.parentTaxEntityId ?? '');
  if (!parentTaxEntityId) throw new HttpError(400, 'parent_tax_entity_id_required');
  await ensureTaxEntity(client, auth.orgId, parentTaxEntityId);

  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const membersInput = Array.isArray(body.members) ? body.members : [];
  if (membersInput.length === 0) throw new HttpError(400, 'members_required');

  const members = membersInput.map((member) => ({
    taxEntityId: String(member.taxEntityId ?? ''),
    name: typeof member.name === 'string' ? member.name : undefined,
    chargeableIncome: Number(member.chargeableIncome ?? 0),
    taxCredits: Number(member.taxCredits ?? 0),
    participation: Number(member.participation ?? 0),
  }));

  const result = calculateFiscalUnity({
    parentTaxEntityId,
    period,
    members,
    adjustments: Number(body.adjustments ?? 0),
    taxRate: body.taxRate ? Number(body.taxRate) : undefined,
    openingTaxAccount: body.openingTaxAccount ? Number(body.openingTaxAccount) : undefined,
    paymentsMade: body.paymentsMade ? Number(body.paymentsMade) : undefined,
  });

  const { data: record, error } = await client
    .from('fiscal_unity_computations')
    .insert({
      org_id: auth.orgId,
      parent_tax_entity_id: parentTaxEntityId,
      period,
      members,
      total_chargeable_income: result.totalChargeableIncome,
      total_adjustments: result.totalAdjustments,
      tax_rate: result.taxRate,
      consolidated_cit: result.consolidatedCit,
      total_tax_credits: result.totalTaxCredits,
      net_tax_payable: result.netTaxPayable,
      closing_tax_account: result.closingTaxAccount,
      adjustment_amount: result.adjustmentAmount,
      notes: typeof body.notes === 'string' ? body.notes : null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !record) throw new HttpError(500, error?.message ?? 'fiscal_unity_insert_failed');

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'MT_FISCAL_UNITY_COMPUTED',
    entityId: record.id,
    metadata: {
      period,
      parentTaxEntityId,
      adjustmentAmount: result.adjustmentAmount,
    },
  });

  return { record, result };
}

async function handleVatCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);
  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const result = calculateVatReturn({
    taxEntityId: taxEntity.id,
    period,
    outputsStandard: Number(body.outputsStandard ?? 0),
    outputsReduced: body.outputsReduced ? Number(body.outputsReduced) : undefined,
    inputsStandard: body.inputsStandard ? Number(body.inputsStandard) : undefined,
    inputsCapitalGoods: body.inputsCapitalGoods ? Number(body.inputsCapitalGoods) : undefined,
    inputVatRecoveryRate: body.inputVatRecoveryRate ? Number(body.inputVatRecoveryRate) : undefined,
    intraCommunityAcquisitions: body.intraCommunityAcquisitions ? Number(body.intraCommunityAcquisitions) : undefined,
    distanceSales: body.distanceSales ? Number(body.distanceSales) : undefined,
    manualAdjustments: body.manualAdjustments ? Number(body.manualAdjustments) : undefined,
  });

  const payload = {
    outputsStandard: Number(body.outputsStandard ?? 0),
    outputsReduced: Number(body.outputsReduced ?? 0),
    inputsStandard: Number(body.inputsStandard ?? 0),
    inputsCapitalGoods: Number(body.inputsCapitalGoods ?? 0),
    inputVatRecoveryRate: body.inputVatRecoveryRate ? Number(body.inputVatRecoveryRate) : null,
    intraCommunityAcquisitions: Number(body.intraCommunityAcquisitions ?? 0),
    distanceSales: Number(body.distanceSales ?? 0),
  };

  const { data: record, error } = await client
    .from('vat_filings')
    .insert({
      org_id: auth.orgId,
      tax_entity_id: taxEntity.id,
      period,
      taxable_outputs: result.taxableOutputs,
      output_vat: result.outputVat,
      input_vat: result.inputVat,
      net_vat_due: result.netVatDue,
      manual_adjustments: result.manualAdjustments,
      net_payable_after_adjustments: result.netPayableAfterAdjustments,
      adjustment_amount: result.adjustmentAmount,
      payload,
      filing_type: typeof body.filingType === 'string' ? body.filingType : 'VAT',
      notes: typeof body.notes === 'string' ? body.notes : null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !record) throw new HttpError(500, error?.message ?? 'vat_insert_failed');

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'VAT_RETURN_COMPUTED',
    entityId: record.id,
    metadata: {
      period,
      taxEntityId: taxEntity.id,
      netVatDue: result.netPayableAfterAdjustments,
    },
  });

  return { record, result };
}

async function handleDac6Create(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);
  const reference = String(body.reference ?? '').trim();
  if (!reference) throw new HttpError(400, 'reference_required');

  const hallmarks = Array.isArray(body.hallmarks) ? body.hallmarks : [];
  if (hallmarks.length === 0) throw new HttpError(400, 'hallmarks_required');

  const assessment = assessDac6({
    arrangementReference: reference,
    description: typeof body.description === 'string' ? body.description : undefined,
    firstStepDate: typeof body.firstStepDate === 'string' ? body.firstStepDate : undefined,
    participants: Array.isArray(body.participants)
      ? body.participants.map((participant) => ({
          name: String(participant.name ?? ''),
          role: String(participant.role ?? 'RELEVANT_TAXPAYER').toUpperCase(),
          jurisdiction: participant.jurisdiction ? String(participant.jurisdiction) : undefined,
          tin: participant.tin ? String(participant.tin) : undefined,
        }))
      : [],
    hallmarks: hallmarks.map((hallmark) => ({
      category: String(hallmark.category ?? 'A').toUpperCase(),
      code: String(hallmark.code ?? ''),
      mainBenefitTest: Boolean(hallmark.mainBenefitTest),
      description: hallmark.description ? String(hallmark.description) : undefined,
    })),
    mainBenefitIndicators: body.mainBenefitIndicators as any,
    hallmarkIndicators: body.hallmarkIndicators as any,
    notes: typeof body.notes === 'string' ? body.notes : undefined,
  });

  const { data: arrangement, error } = await client
    .from('dac6_arrangements')
    .insert({
      org_id: auth.orgId,
      tax_entity_id: taxEntity.id,
      reference,
      description: typeof body.description === 'string' ? body.description : null,
      first_step_date: typeof body.firstStepDate === 'string' ? body.firstStepDate : null,
      disclosure_due_date: typeof body.disclosureDueDate === 'string' ? body.disclosureDueDate : null,
      status: assessment.reportingRequired ? 'READY_FOR_SUBMISSION' : 'DRAFT',
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !arrangement) throw new HttpError(500, error?.message ?? 'dac6_insert_failed');

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'DAC6_ASSESSED',
    entityId: arrangement.id,
    metadata: {
      reference,
      reportingRequired: assessment.reportingRequired,
      reasons: assessment.reasons,
    },
  });

  const hallmarkRows = assessment.primaryHallmarks.concat(assessment.additionalHallmarks).map((hallmark) => ({
    arrangement_id: arrangement.id,
    category: hallmark.category,
    code: hallmark.code,
    main_benefit_test: hallmark.mainBenefitTest ?? false,
    description: hallmark.description ?? null,
    metadata: {},
  }));

  if (hallmarkRows.length > 0) {
    await client.from('dac6_hallmarks').insert(hallmarkRows);
  }

  if (Array.isArray(body.participants) && body.participants.length > 0) {
    const participantRows = body.participants.map((participant) => ({
      arrangement_id: arrangement.id,
      name: String(participant.name ?? 'Unknown participant'),
      role: String(participant.role ?? 'RELEVANT_TAXPAYER'),
      jurisdiction: participant.jurisdiction ? String(participant.jurisdiction) : null,
      tin: participant.tin ? String(participant.tin) : null,
      metadata: participant.metadata ?? {},
    }));
    await client.from('dac6_participants').insert(participantRows);
  }

  return { arrangement, assessment };
}

function requirePositiveNumber(value: unknown, errorKey: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new HttpError(400, errorKey);
  }
  return numeric;
}

function optionalNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function requireNumber(value: unknown, errorKey: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new HttpError(400, errorKey);
  }
  return numeric;
}

const toNumberOrDefault = (value: unknown, defaultValue = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : defaultValue;
};

async function handleTreatyWhtCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);
  const counterpartyJurisdiction = String(body.counterpartyJurisdiction ?? body.counterparty_jurisdiction ?? '').trim();
  if (!counterpartyJurisdiction) throw new HttpError(400, 'counterparty_jurisdiction_required');
  const paymentType = String(body.paymentType ?? body.payment_type ?? '').trim();
  if (!paymentType) throw new HttpError(400, 'payment_type_required');

  const grossAmount = requirePositiveNumber(body.grossAmount ?? body.gross_amount, 'invalid_gross_amount');
  const domesticRateInput = requirePositiveNumber(body.domesticRate ?? body.domestic_rate, 'invalid_domestic_rate');
  const treatyRateInput = Number(body.treatyRate ?? body.treaty_rate ?? 0);
  if (!Number.isFinite(treatyRateInput) || treatyRateInput < 0) {
    throw new HttpError(400, 'invalid_treaty_rate');
  }

  const result = calculateTreatyWht({ grossAmount, domesticRate: domesticRateInput, treatyRate: treatyRateInput });
  const reliefMethod = String(body.reliefMethod ?? body.relief_method ?? 'CREDIT').toUpperCase();

  const { data: record, error } = await client
    .from('treaty_wht_calculations')
    .insert({
      org_id: auth.orgId,
      tax_entity_id: taxEntity.id,
      counterparty_jurisdiction,
      payment_type: paymentType,
      treaty_article: typeof body.treatyArticle === 'string' ? body.treatyArticle : null,
      domestic_rate: result.domesticRate,
      treaty_rate: result.treatyRate,
      gross_amount: grossAmount,
      withholding_before: result.withholdingBefore,
      withholding_after: result.withholdingAfter,
      relief_amount: result.reliefAmount,
      relief_method: reliefMethod,
      notes: typeof body.notes === 'string' ? body.notes : null,
      metadata: normaliseMetadata(body.metadata),
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !record) throw new HttpError(500, error?.message ?? 'treaty_wht_insert_failed');

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'TREATY_WHT_COMPUTED',
    entityId: record.id,
    metadata: {
      paymentType,
      counterpartyJurisdiction,
      domesticRate: result.domesticRate,
      treatyRate: result.treatyRate,
      reliefAmount: result.reliefAmount,
    },
  });

  return {
    calculation: record,
    result: {
      withholdingBefore: result.withholdingBefore,
      withholdingAfter: result.withholdingAfter,
      reliefAmount: result.reliefAmount,
      domesticRate: result.domesticRate,
      treatyRate: result.treatyRate,
      reliefRate: result.reliefRate,
    },
  };
}

async function handleUpsertDisputeCase(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const caseId = typeof body.caseId === 'string' ? body.caseId : typeof body.id === 'string' ? body.id : null;
  const caseType = String(body.caseType ?? body.case_type ?? '').toUpperCase();
  if (!disputeCaseTypes.has(caseType)) throw new HttpError(400, 'invalid_case_type');

  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);
  const counterpartyJurisdiction = String(body.counterpartyJurisdiction ?? body.counterparty_jurisdiction ?? '').trim();
  if (!counterpartyJurisdiction) throw new HttpError(400, 'counterparty_jurisdiction_required');

  const statusInput = String(body.status ?? '').toUpperCase();
  const status: TaxDisputeStatus = disputeStatusSet.has(statusInput as TaxDisputeStatus)
    ? (statusInput as TaxDisputeStatus)
    : 'OPEN';

  const payload = {
    org_id: auth.orgId,
    tax_entity_id: taxEntity.id,
    case_type: caseType,
    counterparty_jurisdiction,
    counterparty_authority: typeof body.counterpartyAuthority === 'string'
      ? body.counterpartyAuthority
      : typeof body.counterparty_authority === 'string'
      ? (body.counterparty_authority as string)
      : null,
    case_reference: typeof body.caseReference === 'string'
      ? body.caseReference
      : typeof body.case_reference === 'string'
      ? (body.case_reference as string)
      : null,
    status,
    opened_on: toIsoDate(body.openedOn ?? body.opened_on, undefined),
    expected_resolution: typeof body.expectedResolution === 'string'
      ? body.expectedResolution
      : typeof body.expected_resolution === 'string'
      ? (body.expected_resolution as string)
      : null,
    relief_amount: optionalNumber(body.reliefAmount ?? body.relief_amount),
    issue_summary: typeof body.issueSummary === 'string'
      ? body.issueSummary
      : typeof body.issue_summary === 'string'
      ? (body.issue_summary as string)
      : null,
    notes: typeof body.notes === 'string' ? body.notes : null,
    metadata: normaliseMetadata(body.metadata),
    updated_by: auth.userId,
  };

  if (caseId) {
    const { data, error } = await client
      .from('tax_dispute_cases')
      .update(payload)
      .eq('org_id', auth.orgId)
      .eq('id', caseId)
      .select()
      .maybeSingle();
    if (error || !data) throw new HttpError(500, error?.message ?? 'tax_dispute_case_update_failed');
    return { case: data };
  }

  const { data, error } = await client
    .from('tax_dispute_cases')
    .insert({ ...payload, created_by: auth.userId })
    .select()
    .maybeSingle();
  if (error || !data) throw new HttpError(500, error?.message ?? 'tax_dispute_case_insert_failed');
  return { case: data };
}

async function handleAddDisputeEvent(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const disputeId = String(body.caseId ?? body.disputeId ?? '').trim();
  if (!disputeId) throw new HttpError(400, 'dispute_id_required');

  const { data: dispute, error: disputeError } = await client
    .from('tax_dispute_cases')
    .select('id')
    .eq('org_id', auth.orgId)
    .eq('id', disputeId)
    .maybeSingle();
  if (disputeError) throw new HttpError(500, 'tax_dispute_lookup_failed');
  if (!dispute) throw new HttpError(404, 'tax_dispute_not_found');

  const eventType = String(body.eventType ?? body.event_type ?? '').trim();
  if (!eventType) throw new HttpError(400, 'event_type_required');
  const eventDate = toIsoDate(body.eventDate ?? body.event_date, undefined);

  const { data: event, error } = await client
    .from('tax_dispute_events')
    .insert({
      org_id: auth.orgId,
      dispute_id: disputeId,
      event_type: eventType,
      event_date: eventDate,
      description: typeof body.description === 'string' ? body.description : null,
      metadata: normaliseMetadata(body.metadata),
      created_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !event) throw new HttpError(500, error?.message ?? 'tax_dispute_event_insert_failed');

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'TAX_DISPUTE_EVENT_LOGGED',
    entityId: disputeId,
    metadata: {
      eventType,
      eventDate,
    },
  });

  return { event };
}

async function handlePillarTwoCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const rootTaxEntityId = String(body.rootTaxEntityId ?? body.root_tax_entity_id ?? '');
  if (!rootTaxEntityId) throw new HttpError(400, 'root_tax_entity_id_required');
  await ensureTaxEntity(client, auth.orgId, rootTaxEntityId);

  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  const jurisdictionsInput = Array.isArray(body.jurisdictions) ? body.jurisdictions : [];
  if (jurisdictionsInput.length === 0) throw new HttpError(400, 'jurisdictions_required');

  const jurisdictions = [] as Array<{
    taxEntityId: string;
    jurisdiction: string;
    globeIncome: number;
    coveredTaxes: number;
    substanceCarveOut: number;
    qdmtPaid: number;
    ownershipPercentage: number;
    safeHarbourThreshold?: number;
  }>;

  const coerceNumber = (value: unknown, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  for (const item of jurisdictionsInput) {
    const taxEntityId = String((item as Record<string, unknown>)?.taxEntityId ?? (item as Record<string, unknown>)?.tax_entity_id ?? '');
    if (!taxEntityId) throw new HttpError(400, 'jurisdiction_tax_entity_id_required');
    const entity = await ensureTaxEntity(client, auth.orgId, taxEntityId);
    const jurisdictionName = typeof (item as Record<string, unknown>)?.jurisdiction === 'string'
      ? String((item as Record<string, unknown>).jurisdiction)
      : taxEntityId;

    jurisdictions.push({
      taxEntityId: entity.id,
      jurisdiction: jurisdictionName,
      globeIncome: coerceNumber((item as Record<string, unknown>)?.globeIncome ?? (item as Record<string, unknown>)?.globe_income, 0),
      coveredTaxes: coerceNumber((item as Record<string, unknown>)?.coveredTaxes ?? (item as Record<string, unknown>)?.covered_taxes, 0),
      substanceCarveOut: Math.max(
        0,
        coerceNumber((item as Record<string, unknown>)?.substanceCarveOut ?? (item as Record<string, unknown>)?.substance_carve_out, 0),
      ),
      qdmtPaid: Math.max(0, coerceNumber((item as Record<string, unknown>)?.qdmtPaid ?? (item as Record<string, unknown>)?.qdmt_paid, 0)),
      ownershipPercentage: (() => {
        const value = (item as Record<string, unknown>)?.ownershipPercentage ?? (item as Record<string, unknown>)?.ownership_percentage;
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 1;
        if (numeric <= 0) return 0;
        return Math.min(numeric, 1);
      })(),
      safeHarbourThreshold: Number.isFinite(
        Number((item as Record<string, unknown>)?.safeHarbourThreshold ?? (item as Record<string, unknown>)?.safe_harbour_threshold),
      )
        ? Number((item as Record<string, unknown>)?.safeHarbourThreshold ?? (item as Record<string, unknown>)?.safe_harbour_threshold)
        : undefined,
    });
  }

  const minimumRate = Number.isFinite(Number(body.minimumRate ?? body.minimum_rate))
    ? Number(body.minimumRate ?? body.minimum_rate)
    : 0.15;

  const summary = calculatePillarTwo({
    rootTaxEntityId,
    period,
    jurisdictions,
    minimumRate,
  });

  const girReference = typeof body.girReference === 'string' && body.girReference.trim().length > 0
    ? body.girReference.trim()
    : `GIR-${period}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;

  const inputPayload = {
    jurisdictions,
    minimumRate: summary.minimumRate,
  };

  const { data: computation, error } = await client
    .from('pillar_two_computations')
    .insert({
      org_id: auth.orgId,
      root_tax_entity_id: rootTaxEntityId,
      period,
      gir_reference: girReference,
      jurisdiction_results: summary.jurisdictions,
      input_payload: inputPayload,
      gir_payload: summary.gir,
      total_top_up_tax: summary.totalTopUpTax,
      qdmt_top_up_tax: summary.qdmtTopUpTax,
      iir_top_up_tax: summary.iirTopUpTax,
      notes: typeof body.notes === 'string' ? body.notes : null,
      metadata:
        typeof body.metadata === 'object' && body.metadata !== null
          ? (body.metadata as Record<string, unknown>)
          : {},
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !computation) throw new HttpError(500, error?.message ?? 'pillar_two_insert_failed');

  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: 'PILLAR_TWO_COMPUTED',
    entityId: computation.id,
    metadata: {
      period,
      rootTaxEntityId,
      totalTopUpTax: summary.totalTopUpTax,
      qdmtTopUpTax: summary.qdmtTopUpTax,
      iirTopUpTax: summary.iirTopUpTax,
    },
  });

  return { computation, summary };
}

async function handleUsOverlayCompute(
  client: TypedClient,
  auth: { orgId: string; userId: string },
  body: Record<string, unknown>,
) {
  const overlayTypeRaw = String(body.overlayType ?? body.overlay_type ?? '').toUpperCase();
  if (!usOverlayTypes.has(overlayTypeRaw)) throw new HttpError(400, 'invalid_overlay_type');
  const overlayType = overlayTypeRaw as 'GILTI' | '163J' | 'CAMT' | 'EXCISE_4501';

  const taxEntity = await ensureTaxEntity(client, auth.orgId, body.taxEntityId as string | null);
  const period = String(body.period ?? '').trim();
  if (!period) throw new HttpError(400, 'period_required');

  let inputs: Record<string, number> = {};
  let overlayInput: any;

  if (overlayType === 'GILTI') {
    const testedIncome = requireNumber(body.testedIncome ?? body.tested_income, 'invalid_tested_income');
    const qbaI = requireNumber(body.qbaI ?? body.qbai, 'invalid_qbai');
    const testedLoss = toNumberOrDefault(body.testedLoss ?? body.tested_loss);
    const interestExpense = toNumberOrDefault(body.interestExpense ?? body.interest_expense);
    const foreignTaxesPaid = toNumberOrDefault(body.foreignTaxesPaid ?? body.foreign_taxes_paid);
    const ftcLimit = toNumberOrDefault(body.ftcLimit ?? body.ftc_limit, 0.8);
    const corporateRate = toNumberOrDefault(body.corporateRate ?? body.corporate_rate, 0.21);
    const section250DeductionRate = toNumberOrDefault(body.section250DeductionRate ?? body.section250_deduction_rate, 0.5);
    const ftcPercentage = toNumberOrDefault(body.ftcPercentage ?? body.ftc_percentage, 0.8);

    overlayInput = {
      overlayType: 'GILTI' as const,
      testedIncome,
      testedLoss,
      qbaI,
      interestExpense,
      foreignTaxesPaid,
      ftcLimit,
      corporateRate,
      section250DeductionRate,
      ftcPercentage,
    };
    inputs = {
      testedIncome,
      testedLoss,
      qbaI,
      interestExpense,
      foreignTaxesPaid,
      ftcLimit,
      corporateRate,
      section250DeductionRate,
      ftcPercentage,
    };
  } else if (overlayType === '163J') {
    const businessInterestExpense = requireNumber(
      body.businessInterestExpense ?? body.business_interest_expense,
      'invalid_business_interest_expense',
    );
    const adjustedTaxableIncome = requireNumber(
      body.adjustedTaxableIncome ?? body.adjusted_taxable_income,
      'invalid_adjusted_taxable_income',
    );
    const businessInterestIncome = toNumberOrDefault(body.businessInterestIncome ?? body.business_interest_income);
    const floorPlanInterest = toNumberOrDefault(body.floorPlanInterest ?? body.floor_plan_interest);
    const carryforwardInterest = toNumberOrDefault(body.carryforwardInterest ?? body.carryforward_interest);

    overlayInput = {
      overlayType: '163J' as const,
      businessInterestExpense,
      businessInterestIncome,
      adjustedTaxableIncome,
      floorPlanInterest,
      carryforwardInterest,
    };
    inputs = {
      businessInterestExpense,
      businessInterestIncome,
      adjustedTaxableIncome,
      floorPlanInterest,
      carryforwardInterest,
    };
  } else if (overlayType === 'CAMT') {
    const adjustedFinancialStatementIncome = requireNumber(
      body.adjustedFinancialStatementIncome ?? body.adjusted_financial_statement_income,
      'invalid_afsi',
    );
    const regularTaxLiability = requireNumber(
      body.regularTaxLiability ?? body.regular_tax_liability,
      'invalid_regular_tax_liability',
    );
    const camtCreditCarryforward = toNumberOrDefault(body.camtCreditCarryforward ?? body.camt_credit_carryforward);
    const camtRate = toNumberOrDefault(body.camtRate ?? body.camt_rate, 0.15);

    overlayInput = {
      overlayType: 'CAMT' as const,
      adjustedFinancialStatementIncome,
      camtCreditCarryforward,
      regularTaxLiability,
      camtRate,
    };
    inputs = {
      adjustedFinancialStatementIncome,
      camtCreditCarryforward,
      regularTaxLiability,
      camtRate,
    };
  } else {
    const netRepurchase = requireNumber(body.netRepurchase ?? body.net_repurchase, 'invalid_net_repurchase');
    const permittedExceptions = toNumberOrDefault(body.permittedExceptions ?? body.permitted_exceptions);
    const rate = toNumberOrDefault(body.rate, 0.01);

    overlayInput = {
      overlayType: 'EXCISE_4501' as const,
      netRepurchase,
      permittedExceptions,
      rate,
    };
    inputs = {
      netRepurchase,
      permittedExceptions,
      rate,
    };
  }

  const overlayResult = calculateUsOverlay(overlayInput);
  const { overlayType: _, ...resultData } = overlayResult as Record<string, unknown>;

  let adjustmentAmount = 0;
  switch (overlayType) {
    case 'GILTI':
      adjustmentAmount = (overlayResult as ReturnType<typeof calculateUsOverlay>).netGiltiTax ?? 0;
      break;
    case '163J':
      adjustmentAmount = (overlayResult as ReturnType<typeof calculateUsOverlay>).disallowedInterest ?? 0;
      break;
    case 'CAMT':
      adjustmentAmount = (overlayResult as ReturnType<typeof calculateUsOverlay>).camtTopUp ?? 0;
      break;
    case 'EXCISE_4501':
      adjustmentAmount = (overlayResult as ReturnType<typeof calculateUsOverlay>).exciseTax ?? 0;
      break;
    default:
      adjustmentAmount = 0;
  }

  const { data: calculation, error } = await client
    .from('us_tax_overlay_calculations')
    .insert({
      org_id: auth.orgId,
      tax_entity_id: taxEntity.id,
      period,
      overlay_type: overlayType,
      inputs,
      results: resultData as Record<string, unknown>,
      adjustment_amount: adjustmentAmount,
      notes: typeof body.notes === 'string' ? body.notes : null,
      metadata: normaliseMetadata(body.metadata),
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .maybeSingle();

  if (error || !calculation) throw new HttpError(500, error?.message ?? 'us_overlay_insert_failed');

  const activityAction = usOverlayActivityMap[overlayType];
  await logActivity(client, {
    orgId: auth.orgId,
    userId: auth.userId,
    action: activityAction,
    entityId: calculation.id,
    metadata: {
      period,
      overlayType,
      adjustmentAmount,
    },
  });

  return {
    calculation,
    result: overlayResult,
    adjustmentAmount,
  };
}

async function handleList(
  client: TypedClient,
  auth: { orgId: string },
  calculator: 'NID' | 'PATENT_BOX' | 'ILR' | 'CFC' | 'FISCAL_UNITY' | 'VAT' | 'DAC6' | 'PILLAR_TWO' | 'TREATY_WHT',
  params: URLSearchParams,
) {
  const taxEntityId = params.get('taxEntityId');
  const period = params.get('period');
  const status = params.get('status');

  if (calculator === 'TREATY_WHT') {
    const resource = (params.get('resource') ?? 'CALCULATIONS').toUpperCase();
    if (resource === 'CASES') {
      const statusFilter = status ? status.toUpperCase() : undefined;
      const query = client
        .from('tax_dispute_cases')
        .select('*')
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (taxEntityId) query.eq('tax_entity_id', taxEntityId);
      if (statusFilter && disputeStatusSet.has(statusFilter as TaxDisputeStatus)) {
        query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw new HttpError(500, error.message ?? 'list_failed');
      return data ?? [];
    }

    if (resource === 'EVENTS') {
      const disputeId = params.get('disputeId');
      if (!disputeId) throw new HttpError(400, 'dispute_id_required');
      const { data, error } = await client
        .from('tax_dispute_events')
        .select('*')
        .eq('org_id', auth.orgId)
        .eq('dispute_id', disputeId)
        .order('event_date', { ascending: false })
        .limit(100);
      if (error) throw new HttpError(500, error.message ?? 'list_failed');
      return data ?? [];
    }

    const query = client
      .from('treaty_wht_calculations')
      .select('*')
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (taxEntityId) query.eq('tax_entity_id', taxEntityId);
    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message ?? 'list_failed');
    return data ?? [];
  }

  if (calculator === 'US_OVERLAY') {
    const overlayType = params.get('overlayType')?.toUpperCase();
    const query = client
      .from('us_tax_overlay_calculations')
      .select('*')
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (taxEntityId) query.eq('tax_entity_id', taxEntityId);
    if (overlayType && usOverlayTypes.has(overlayType)) {
      query.eq('overlay_type', overlayType);
    }
    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message ?? 'list_failed');
    return data ?? [];
  }

  let baseQuery;
  switch (calculator) {
    case 'PATENT_BOX':
      baseQuery = client.from('patent_box_computations').select('*');
      break;
    case 'ILR':
      baseQuery = client.from('interest_limitation_computations').select('*');
      break;
    case 'CFC':
      baseQuery = client.from('cfc_inclusions').select('*');
      break;
    case 'FISCAL_UNITY':
      baseQuery = client.from('fiscal_unity_computations').select('*');
      break;
    case 'VAT':
      baseQuery = client.from('vat_filings').select('*');
      break;
    case 'DAC6':
      baseQuery = client.from('dac6_arrangements').select('*');
      break;
    case 'PILLAR_TWO':
      baseQuery = client.from('pillar_two_computations').select('*');
      break;
    case 'NID':
    default:
      baseQuery = client.from('nid_computations').select('*');
      break;
  }

  baseQuery.eq('org_id', auth.orgId).order('created_at', { ascending: false });

  if (taxEntityId) {
    if (calculator === 'FISCAL_UNITY') {
      baseQuery.eq('parent_tax_entity_id', taxEntityId);
    } else if (calculator === 'PILLAR_TWO') {
      baseQuery.eq('root_tax_entity_id', taxEntityId);
    } else {
      baseQuery.eq('tax_entity_id', taxEntityId);
    }
  }
  if (period) baseQuery.eq('period', period);
  if (status && calculator === 'DAC6') baseQuery.eq('status', status);

  const { data, error } = await baseQuery.limit(50);
  if (error) throw new HttpError(500, error.message ?? 'list_failed');

  return data ?? [];
}

serve(async (request) => {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return jsonResponse(401, { error: 'missing_authorization' });

  const client = await createSupabaseClient(authHeader);

  let orgId: string | null = null;
  let orgSlug: string | null = null;
  let contextInfo: Record<string, unknown> | undefined;
  let calculatorContext: string | null = null;

  try {
    const user = await getUser(client);
    const url = new URL(request.url);
    const calculatorParam = (url.searchParams.get('calculator') ?? '').toUpperCase();
    const calculator = [
      'PATENT_BOX',
      'ILR',
      'CFC',
      'NID',
      'FISCAL_UNITY',
      'VAT',
      'DAC6',
      'PILLAR_TWO',
      'TREATY_WHT',
      'US_OVERLAY',
    ].includes(
      calculatorParam,
    )
      ? (calculatorParam as
          | 'PATENT_BOX'
          | 'ILR'
          | 'CFC'
          | 'NID'
          | 'FISCAL_UNITY'
          | 'VAT'
          | 'DAC6'
          | 'PILLAR_TWO'
          | 'TREATY_WHT'
          | 'US_OVERLAY')
      : 'NID';

    if (request.method === 'GET') {
      orgSlug = url.searchParams.get('orgSlug');
      const context = await getOrgContext(client, orgSlug, user.id);
      orgId = context.orgId;
      requireRole(context.role, 'EMPLOYEE');
      calculatorContext = calculator;
      contextInfo = { method: 'GET', calculator };

      const data = await handleList(client, { orgId }, calculator, url.searchParams);
      return jsonResponse(200, { calculator, data });
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const calculatorFromBody = typeof body.calculator === 'string' ? body.calculator.toUpperCase() : calculator;
      const effectiveCalculator = [
        'PATENT_BOX',
        'ILR',
        'CFC',
        'NID',
        'FISCAL_UNITY',
        'VAT',
        'DAC6',
        'PILLAR_TWO',
        'TREATY_WHT',
        'US_OVERLAY',
      ].includes(
        calculatorFromBody,
      )
        ? (calculatorFromBody as
            | 'PATENT_BOX'
            | 'ILR'
            | 'CFC'
            | 'NID'
            | 'FISCAL_UNITY'
            | 'VAT'
            | 'DAC6'
            | 'PILLAR_TWO'
            | 'TREATY_WHT'
            | 'US_OVERLAY')
        : 'NID';

      orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug : url.searchParams.get('orgSlug');
      const context = await getOrgContext(client, orgSlug, user.id);
      orgId = context.orgId;
      requireRole(context.role, 'EMPLOYEE');
      calculatorContext = effectiveCalculator;
      contextInfo = { method: 'POST', calculator: effectiveCalculator };

      if (effectiveCalculator === 'PATENT_BOX') {
        const payload = await handlePatentBoxCompute(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          computation: payload.record,
          result: payload.result,
        });
      }

      if (effectiveCalculator === 'ILR') {
        const payload = await handleInterestLimitationCompute(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          computation: payload.record,
          result: payload.result,
        });
      }

      if (effectiveCalculator === 'CFC') {
        const payload = await handleCfcCompute(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          computation: payload.record,
          result: payload.result,
        });
      }

      if (effectiveCalculator === 'FISCAL_UNITY') {
        const payload = await handleFiscalUnityCompute(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          computation: payload.record,
          result: payload.result,
        });
      }

      if (effectiveCalculator === 'VAT') {
        const payload = await handleVatCompute(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          computation: payload.record,
          result: payload.result,
        });
      }

      if (effectiveCalculator === 'DAC6') {
        const payload = await handleDac6Create(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          arrangement: payload.arrangement,
          assessment: payload.assessment,
        });
      }

      if (effectiveCalculator === 'TREATY_WHT') {
        const action = String(body.action ?? 'COMPUTE').toUpperCase();
        if (action === 'UPSERT_CASE') {
          const payload = await handleUpsertDisputeCase(client, { orgId, userId: user.id }, body);
          return jsonResponse(200, {
            calculator: effectiveCalculator,
            case: payload.case,
          });
        }
        if (action === 'ADD_EVENT') {
          const payload = await handleAddDisputeEvent(client, { orgId, userId: user.id }, body);
          return jsonResponse(200, {
            calculator: effectiveCalculator,
            event: payload.event,
          });
        }

        const payload = await handleTreatyWhtCompute(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          calculation: payload.calculation,
          result: payload.result,
        });
      }

      if (effectiveCalculator === 'PILLAR_TWO') {
        const payload = await handlePillarTwoCompute(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          computation: payload.computation,
          summary: payload.summary,
        });
      }

      if (effectiveCalculator === 'US_OVERLAY') {
        const payload = await handleUsOverlayCompute(client, { orgId, userId: user.id }, body);
        return jsonResponse(200, {
          calculator: effectiveCalculator,
          calculation: payload.calculation,
          result: payload.result,
          adjustmentAmount: payload.adjustmentAmount,
        });
      }

      const payload = await handleNidCompute(client, { orgId, userId: user.id }, body);
      return jsonResponse(200, {
        calculator: 'NID',
        computation: payload.record,
        result: payload.result,
      });
    }

    return jsonResponse(405, { error: 'method_not_allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    if (error instanceof HttpError) {
      if (error.status >= 500) {
        await logEdgeError(client, {
          module: calculatorContext ? `TAX_${calculatorContext}` : 'TAX_MT_NID',
          message,
          orgId,
          orgSlug,
          context: contextInfo,
        });
      }
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('tax-mt-nid error', error);
    await logEdgeError(client, {
      module: calculatorContext ? `TAX_${calculatorContext}` : 'TAX_MT_NID',
      message,
      orgId,
      orgSlug,
      context: contextInfo,
    });
    return jsonResponse(500, { error: 'internal_error' });
  }
});
