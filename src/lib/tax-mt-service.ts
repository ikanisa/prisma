import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionBaseUrl } from '@/lib/supabase-functions';

const FUNCTIONS_BASE_URL = getSupabaseFunctionBaseUrl('tax-mt-cit');
const TAX_CALCULATORS_BASE_URL = getSupabaseFunctionBaseUrl('tax-mt-nid');

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${FUNCTIONS_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(json?.error ?? 'Request failed');
  }

  return json as T;
}

async function requestCalculator<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${TAX_CALCULATORS_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(json?.error ?? 'Request failed');
  }

  return json as T;
}

export function computeCit(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  preTaxProfit: number;
  adjustments: Array<{ label: string; amount: number }>;
  participationExempt: boolean;
  refundProfile: '6_7' | '5_7' | '2_3' | 'NONE';
  notes?: string;
}) {
  return request<{ computationId: string; chargeableIncome: number; citAmount: number; refundAmount: number }>(
    `/compute`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function prepareCitReturn(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
}) {
  return request<{ returnFile: { id: string; payload_meta: unknown; status: string } }>(`/prepare-return`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitCitForApproval(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  engagementId?: string;
}) {
  return request<{ approvalId: string }>(`/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function approveCit(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  approvalId: string;
  decision?: 'APPROVED' | 'REJECTED';
  note?: string;
}) {
  return request<{ status: string }>(`/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface NidComputation {
  id: string;
  period: string;
  tax_entity_id: string;
  equity_base: number;
  reference_rate: number;
  deduction_after_carryforward: number;
  adjustment_amount: number;
  gross_deduction: number;
  capped_deduction: number;
  created_at: string;
  notes: string | null;
}

export interface PatentBoxComputation {
  id: string;
  period: string;
  tax_entity_id: string;
  deduction_amount: number;
  adjustment_amount: number;
  routine_return: number;
  nexus_fraction: number;
  deduction_base: number;
  created_at: string;
  notes: string | null;
}

export function computeNidAdjustment(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  equityBase: number;
  riskFreeRate?: number;
  riskPremium?: number;
  referenceRateOverride?: number;
  priorDeduction?: number;
  chargeableIncomeBeforeNid?: number;
  capRatio?: number;
  notes?: string;
}) {
  return requestCalculator<{ calculator: 'NID'; computation: NidComputation; result: { adjustmentAmount: number } }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'NID' }),
    },
  );
}

export function computePatentBoxAdjustment(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  qualifyingIpIncome: number;
  qualifyingExpenditure: number;
  overallExpenditure: number;
  routineReturnRate?: number;
  upliftCap?: number;
  deductionRate?: number;
  notes?: string;
}) {
  return requestCalculator<{
    calculator: 'PATENT_BOX';
    computation: PatentBoxComputation;
    result: { adjustmentAmount: number };
  }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'PATENT_BOX' }),
    },
  );
}

export function listNidComputations(params: {
  orgSlug: string;
  taxEntityId?: string;
  period?: string;
}) {
  const query = new URLSearchParams({ calculator: 'NID', orgSlug: params.orgSlug });
  if (params.taxEntityId) query.set('taxEntityId', params.taxEntityId);
  if (params.period) query.set('period', params.period);

  return requestCalculator<{ calculator: 'NID'; data: NidComputation[] }>(`/list?${query.toString()}`);
}

export function listPatentBoxComputations(params: {
  orgSlug: string;
  taxEntityId?: string;
  period?: string;
}) {
  const query = new URLSearchParams({ calculator: 'PATENT_BOX', orgSlug: params.orgSlug });
  if (params.taxEntityId) query.set('taxEntityId', params.taxEntityId);
  if (params.period) query.set('period', params.period);

  return requestCalculator<{ calculator: 'PATENT_BOX'; data: PatentBoxComputation[] }>(`/list?${query.toString()}`);
}

export interface InterestLimitationComputation {
  id: string;
  period: string;
  tax_entity_id: string;
  exceeding_borrowing_costs: number;
  tax_ebitda: number;
  allowed_interest: number;
  disallowed_interest: number;
  updated_carryforward_interest: number;
  updated_carryforward_capacity: number;
  adjustment_amount: number;
  created_at: string;
  notes: string | null;
}

export interface CfcInclusion {
  id: string;
  period: string;
  tax_entity_id: string;
  cfc_entity_name: string | null;
  inclusion_amount: number;
  tax_credit_eligible: number;
  adjustment_amount: number;
  foreign_rate: number;
  domestic_rate: number;
  created_at: string;
  notes: string | null;
}

export interface FiscalUnityComputation {
  id: string;
  period: string;
  parent_tax_entity_id: string;
  members: Array<{
    taxEntityId: string;
    name?: string;
    chargeableIncome: number;
    taxCredits?: number;
    participation?: number;
  }>;
  total_chargeable_income: number;
  total_adjustments: number;
  tax_rate: number;
  consolidated_cit: number;
  total_tax_credits: number;
  net_tax_payable: number;
  closing_tax_account: number;
  adjustment_amount: number;
  created_at: string;
  notes: string | null;
}

export function computeInterestLimitation(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  exceedingBorrowingCosts: number;
  taxEbitda: number;
  standaloneAllowance?: number;
  safeHarbourAmount?: number;
  carryforwardInterest?: number;
  carryforwardCapacity?: number;
  disallowedCarryforward?: number;
  notes?: string;
}) {
  return requestCalculator<{
    calculator: 'ILR';
    computation: InterestLimitationComputation;
    result: { adjustmentAmount: number };
  }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'ILR' }),
    },
  );
}

export function computeCfcInclusion(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  cfcProfit: number;
  foreignTaxPaid: number;
  foreignRate?: number;
  domesticRate?: number;
  participationPercentage: number;
  profitAttributionRatio?: number;
  cfcEntityName?: string;
  notes?: string;
}) {
  return requestCalculator<{
    calculator: 'CFC';
    computation: CfcInclusion;
    result: { adjustmentAmount: number };
  }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'CFC' }),
    },
  );
}

export function listInterestLimitationComputations(params: {
  orgSlug: string;
  taxEntityId?: string;
  period?: string;
}) {
  const query = new URLSearchParams({ calculator: 'ILR', orgSlug: params.orgSlug });
  if (params.taxEntityId) query.set('taxEntityId', params.taxEntityId);
  if (params.period) query.set('period', params.period);

  return requestCalculator<{ calculator: 'ILR'; data: InterestLimitationComputation[] }>(`/list?${query.toString()}`);
}

export function listCfcInclusions(params: {
  orgSlug: string;
  taxEntityId?: string;
  period?: string;
}) {
  const query = new URLSearchParams({ calculator: 'CFC', orgSlug: params.orgSlug });
  if (params.taxEntityId) query.set('taxEntityId', params.taxEntityId);
  if (params.period) query.set('period', params.period);

  return requestCalculator<{ calculator: 'CFC'; data: CfcInclusion[] }>(`/list?${query.toString()}`);
}

export function computeFiscalUnity(payload: {
  orgSlug: string;
  parentTaxEntityId: string;
  period: string;
  members: Array<{
    taxEntityId: string;
    name?: string;
    chargeableIncome: number;
    taxCredits?: number;
    participation?: number;
  }>;
  adjustments?: number;
  taxRate?: number;
  openingTaxAccount?: number;
  paymentsMade?: number;
  notes?: string;
}) {
  return requestCalculator<{
    calculator: 'FISCAL_UNITY';
    computation: FiscalUnityComputation;
    result: { adjustmentAmount: number };
  }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'FISCAL_UNITY' }),
    },
  );
}

export function listFiscalUnityComputations(params: {
  orgSlug: string;
  parentTaxEntityId?: string;
  period?: string;
}) {
  const query = new URLSearchParams({ calculator: 'FISCAL_UNITY', orgSlug: params.orgSlug });
  if (params.parentTaxEntityId) query.set('taxEntityId', params.parentTaxEntityId);
  if (params.period) query.set('period', params.period);

  return requestCalculator<{ calculator: 'FISCAL_UNITY'; data: FiscalUnityComputation[] }>(`/list?${query.toString()}`);
}

export interface VatFiling {
  id: string;
  period: string;
  tax_entity_id: string;
  taxable_outputs: number;
  output_vat: number;
  input_vat: number;
  net_vat_due: number;
  manual_adjustments: number;
  net_payable_after_adjustments: number;
  adjustment_amount: number;
  filing_type: string;
  created_at: string;
  notes: string | null;
}

export interface Dac6Arrangement {
  id: string;
  org_id: string;
  tax_entity_id: string;
  reference: string;
  description: string | null;
  status: string;
  first_step_date: string | null;
  disclosure_due_date: string | null;
  created_at: string;
}

export interface Dac6HallmarkRecord {
  id: string;
  arrangement_id: string;
  category: string;
  code: string;
  main_benefit_test: boolean;
  description: string | null;
}

export interface PillarTwoJurisdictionSummary {
  taxEntityId: string;
  jurisdiction: string;
  globeIncome: number;
  coveredTaxes: number;
  substanceCarveOut: number;
  effectiveTaxRate: number;
  excessProfit: number;
  topUpTax: number;
  qdmtCredit: number;
  residualTopUp: number;
  iirShare: number;
  ownershipPercentage: number;
  appliedSafeHarbour: boolean;
}

export interface PillarTwoSummary {
  jurisdictions: PillarTwoJurisdictionSummary[];
  totalTopUpTax: number;
  qdmtTopUpTax: number;
  iirTopUpTax: number;
  minimumRate: number;
  safeHarbourApplied: Array<{ taxEntityId: string; jurisdiction: string }>;
  gir: {
    rootTaxEntityId: string;
    period: string;
    jurisdictions: Array<{
      jurisdiction: string;
      topUpTax: number;
      qdmtCredit: number;
      residualTopUp: number;
    }>;
    totals: {
      totalTopUpTax: number;
      qdmtTopUpTax: number;
      iirTopUpTax: number;
    };
  };
}

export interface PillarTwoComputation {
  id: string;
  period: string;
  root_tax_entity_id: string;
  gir_reference: string | null;
  jurisdiction_results: PillarTwoJurisdictionSummary[];
  input_payload: Record<string, unknown>;
  gir_payload: Record<string, unknown>;
  total_top_up_tax: number;
  qdmt_top_up_tax: number;
  iir_top_up_tax: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TreatyWhtCalculation {
  id: string;
  org_id: string;
  tax_entity_id: string;
  counterparty_jurisdiction: string;
  payment_type: string;
  treaty_article: string | null;
  domestic_rate: number;
  treaty_rate: number;
  gross_amount: number;
  withholding_before: number;
  withholding_after: number;
  relief_amount: number;
  relief_method: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatyWhtSummary {
  withholdingBefore: number;
  withholdingAfter: number;
  reliefAmount: number;
  domesticRate: number;
  treatyRate: number;
  reliefRate: number;
}

export interface TaxDisputeCase {
  id: string;
  org_id: string;
  tax_entity_id: string;
  case_type: 'MAP' | 'APA';
  counterparty_jurisdiction: string;
  counterparty_authority: string | null;
  case_reference: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'RESOLVED' | 'CLOSED';
  opened_on: string;
  expected_resolution: string | null;
  relief_amount: number | null;
  issue_summary: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxDisputeEvent {
  id: string;
  org_id: string;
  dispute_id: string;
  event_type: string;
  event_date: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface UsOverlayCalculation {
  id: string;
  org_id: string;
  tax_entity_id: string;
  period: string;
  overlay_type: 'GILTI' | '163J' | 'CAMT' | 'EXCISE_4501';
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  adjustment_amount: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type UsOverlaySummary = UsOverlayCalculation['results'] & {
  adjustmentAmount: number;
};

export function createDac6Arrangement(payload: {
  orgSlug: string;
  taxEntityId: string;
  reference: string;
  description?: string;
  firstStepDate?: string;
  disclosureDueDate?: string;
  hallmarks: Array<{ category: string; code: string; mainBenefitTest?: boolean; description?: string }>;
  participants: Array<{ name: string; role: string; jurisdiction?: string; tin?: string }>;
  notes?: string;
}) {
  return requestCalculator<{
    calculator: 'DAC6';
    arrangement: Dac6Arrangement;
  }>('/compute', {
    method: 'POST',
    body: JSON.stringify({ ...payload, calculator: 'DAC6' }),
  });
}

export function listDac6Arrangements(params: { orgSlug: string; status?: string }) {
  const query = new URLSearchParams({ calculator: 'DAC6', orgSlug: params.orgSlug });
  if (params.status) query.set('status', params.status);

  return requestCalculator<{ calculator: 'DAC6'; data: Dac6Arrangement[] }>(`/list?${query.toString()}`);
}

export function computeVatReturn(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  outputsStandard: number;
  outputsReduced?: number;
  inputsStandard?: number;
  inputsCapitalGoods?: number;
  inputVatRecoveryRate?: number;
  intraCommunityAcquisitions?: number;
  distanceSales?: number;
  manualAdjustments?: number;
  filingType?: string;
  notes?: string;
}) {
  return requestCalculator<{
    calculator: 'VAT';
    computation: VatFiling;
    result: { adjustmentAmount: number };
  }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'VAT' }),
    },
  );
}

export function listVatFilings(params: {
  orgSlug: string;
  taxEntityId?: string;
  period?: string;
}) {
  const query = new URLSearchParams({ calculator: 'VAT', orgSlug: params.orgSlug });
  if (params.taxEntityId) query.set('taxEntityId', params.taxEntityId);
  if (params.period) query.set('period', params.period);

  return requestCalculator<{ calculator: 'VAT'; data: VatFiling[] }>(`/list?${query.toString()}`);
}

export function computePillarTwo(payload: {
  orgSlug: string;
  rootTaxEntityId: string;
  period: string;
  jurisdictions: Array<{
    taxEntityId: string;
    jurisdiction: string;
    globeIncome: number;
    coveredTaxes: number;
    substanceCarveOut?: number;
    qdmtPaid?: number;
    ownershipPercentage?: number;
    safeHarbourThreshold?: number;
  }>;
  minimumRate?: number;
  notes?: string;
  girReference?: string;
  metadata?: Record<string, unknown>;
}) {
  return requestCalculator<{
    calculator: 'PILLAR_TWO';
    computation: PillarTwoComputation;
    summary: PillarTwoSummary;
  }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'PILLAR_TWO' }),
    },
  );
}

export function listPillarTwoComputations(params: {
  orgSlug: string;
  rootTaxEntityId?: string;
  period?: string;
}) {
  const query = new URLSearchParams({ calculator: 'PILLAR_TWO', orgSlug: params.orgSlug });
  if (params.rootTaxEntityId) query.set('taxEntityId', params.rootTaxEntityId);
  if (params.period) query.set('period', params.period);

  return requestCalculator<{ calculator: 'PILLAR_TWO'; data: PillarTwoComputation[] }>(
    `/list?${query.toString()}`,
  );
}

export function computeTreatyWht(payload: {
  orgSlug: string;
  taxEntityId: string;
  counterpartyJurisdiction: string;
  paymentType: string;
  grossAmount: number;
  domesticRate: number;
  treatyRate: number;
  reliefMethod: string;
  treatyArticle?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  return requestCalculator<{
    calculator: 'TREATY_WHT';
    calculation: TreatyWhtCalculation;
    result: TreatyWhtSummary;
  }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'TREATY_WHT', action: 'COMPUTE' }),
    },
  );
}

export function listTreatyWhtCalculations(params: { orgSlug: string; taxEntityId?: string }) {
  const query = new URLSearchParams({ calculator: 'TREATY_WHT', orgSlug: params.orgSlug });
  if (params.taxEntityId) query.set('taxEntityId', params.taxEntityId);
  return requestCalculator<{ calculator: 'TREATY_WHT'; data: TreatyWhtCalculation[] }>(
    `/list?${query.toString()}`,
  );
}

export function upsertTaxDisputeCase(payload: {
  orgSlug: string;
  taxEntityId: string;
  caseType: 'MAP' | 'APA';
  counterpartyJurisdiction: string;
  counterpartyAuthority?: string;
  caseReference?: string;
  status?: TaxDisputeCase['status'];
  openedOn?: string;
  expectedResolution?: string;
  reliefAmount?: number;
  issueSummary?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  caseId?: string;
}) {
  return requestCalculator<{ calculator: 'TREATY_WHT'; case: TaxDisputeCase }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'TREATY_WHT', action: 'UPSERT_CASE' }),
    },
  );
}

export function listTaxDisputeCases(params: {
  orgSlug: string;
  taxEntityId?: string;
  status?: TaxDisputeCase['status'];
}) {
  const query = new URLSearchParams({ calculator: 'TREATY_WHT', resource: 'CASES', orgSlug: params.orgSlug });
  if (params.taxEntityId) query.set('taxEntityId', params.taxEntityId);
  if (params.status) query.set('status', params.status);
  return requestCalculator<{ calculator: 'TREATY_WHT'; data: TaxDisputeCase[] }>(
    `/list?${query.toString()}`,
  );
}

export function addTaxDisputeEvent(payload: {
  orgSlug: string;
  caseId: string;
  eventType: string;
  eventDate?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  return requestCalculator<{ calculator: 'TREATY_WHT'; event: TaxDisputeEvent }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({ ...payload, calculator: 'TREATY_WHT', action: 'ADD_EVENT' }),
    },
  );
}

export function listTaxDisputeEvents(params: { orgSlug: string; disputeId: string }) {
  const query = new URLSearchParams({
    calculator: 'TREATY_WHT',
    resource: 'EVENTS',
    orgSlug: params.orgSlug,
    disputeId: params.disputeId,
  });
  return requestCalculator<{ calculator: 'TREATY_WHT'; data: TaxDisputeEvent[] }>(
    `/list?${query.toString()}`,
  );
}

export function computeUsOverlay(payload: {
  orgSlug: string;
  taxEntityId: string;
  period: string;
  overlayType: 'GILTI' | '163J' | 'CAMT' | 'EXCISE_4501';
  inputs: Record<string, unknown>;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  return requestCalculator<{
    calculator: 'US_OVERLAY';
    calculation: UsOverlayCalculation;
    result: Record<string, unknown>;
    adjustmentAmount: number;
  }>(
    '/compute',
    {
      method: 'POST',
      body: JSON.stringify({
        calculator: 'US_OVERLAY',
        taxEntityId: payload.taxEntityId,
        orgSlug: payload.orgSlug,
        period: payload.period,
        overlayType: payload.overlayType,
        ...payload.inputs,
        notes: payload.notes,
        metadata: payload.metadata,
      }),
    },
  );
}

export function listUsOverlayCalculations(params: {
  orgSlug: string;
  taxEntityId?: string;
  overlayType?: UsOverlayCalculation['overlay_type'];
}) {
  const query = new URLSearchParams({ calculator: 'US_OVERLAY', orgSlug: params.orgSlug });
  if (params.taxEntityId) query.set('taxEntityId', params.taxEntityId);
  if (params.overlayType) query.set('overlayType', params.overlayType);
  return requestCalculator<{ calculator: 'US_OVERLAY'; data: UsOverlayCalculation[] }>(
    `/list?${query.toString()}`,
  );
}
