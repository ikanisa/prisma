import type { CalculatorResult, Decision, WorkflowSummary } from './types';

const APPROVER_HEAD_OF_TAX = 'Head of Tax';
const APPROVER_GROUP_TAX = 'Group Tax Director';

const PRECISION = 2;

function round(value: number, decimals = PRECISION): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function workflow(
  decision: Decision,
  reasons: string[],
  approvalsRequired: string[],
  nextSteps: string[]
): WorkflowSummary {
  return {
    decision,
    reasons,
    approvalsRequired,
    nextSteps,
  };
}

export interface MaltaCitInput {
  revenue: number;
  deductions: number;
  carryForwardLosses?: number;
  adjustments?: number;
  taxRate: number;
}

export interface MaltaCitMetrics {
  taxableIncome: number;
  taxDue: number;
  effectiveRate: number;
}

export function computeMaltaCit(input: MaltaCitInput): CalculatorResult<MaltaCitMetrics> {
  const carryForward = input.carryForwardLosses ?? 0;
  const adjustments = input.adjustments ?? 0;
  const taxableIncomeRaw = input.revenue - input.deductions - carryForward - adjustments;
  const taxableIncome = round(taxableIncomeRaw);
  const positiveIncome = Math.max(0, taxableIncome);
  const taxDue = round(positiveIncome * input.taxRate);
  const effectiveRate = input.revenue > 0 ? round(taxDue / input.revenue, 4) : 0;

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Archive computation output with working papers'];

  if (taxableIncome <= 0) {
    decision = 'refused';
    reasons.push('Taxable income is non-positive.');
    approvals.push(APPROVER_HEAD_OF_TAX);
    nextSteps.unshift('Escalate to corporate tax manager for manual override.');
  } else if (taxDue > 500000) {
    decision = 'review';
    reasons.push('Tax due exceeds automated release threshold.');
    approvals.push(APPROVER_HEAD_OF_TAX, APPROVER_GROUP_TAX);
    nextSteps.unshift('Schedule management review meeting.');
  }

  return {
    module: 'tax.mt.cit',
    metrics: {
      taxableIncome,
      taxDue,
      effectiveRate,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      revenue: round(input.revenue),
      taxableIncome,
      taxDue,
      effectiveRate,
    },
    evidence: {
      carryForward,
      adjustments,
    },
  };
}

export interface MaltaNidInput {
  equityBase: number;
  riskFreeRate: number;
  riskPremium?: number;
  statutoryCap: number;
}

export interface MaltaNidMetrics {
  deduction: number;
  cappedDeduction: number;
  utilisation: number;
}

export function computeMaltaNid(input: MaltaNidInput): CalculatorResult<MaltaNidMetrics> {
  const riskPremium = input.riskPremium ?? 0;
  const deduction = round(input.equityBase * (input.riskFreeRate + riskPremium));
  const cappedDeduction = round(Math.min(deduction, input.statutoryCap));
  const utilisation = input.statutoryCap > 0 ? round(cappedDeduction / input.statutoryCap, 4) : 0;

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Document participation benefit evidence pack'];

  if (deduction > input.statutoryCap) {
    decision = 'review';
    reasons.push('Deduction exceeds statutory cap.');
    approvals.push(APPROVER_HEAD_OF_TAX);
    nextSteps.unshift('Confirm eligibility for excess carry forward.');
  }

  return {
    module: 'tax.mt.nid',
    metrics: {
      deduction,
      cappedDeduction,
      utilisation,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      deduction,
      cappedDeduction,
      utilisation,
    },
    evidence: {
      riskPremium,
    },
  };
}

export interface AtadIlrInput {
  ebitda: number;
  exceedingBorrowingCosts: number;
  safeHarbourAllowance?: number;
}

export interface AtadIlrMetrics {
  interestBarrier: number;
  disallowedInterest: number;
  utilisation: number;
}

export function evaluateAtadIlr(input: AtadIlrInput): CalculatorResult<AtadIlrMetrics> {
  const safeHarbour = input.safeHarbourAllowance ?? 0;
  const interestBarrier = round(Math.max(0, input.ebitda * 0.3 + safeHarbour));
  const disallowedInterest = round(Math.max(0, input.exceedingBorrowingCosts - interestBarrier));
  const utilisation = interestBarrier > 0 ? round((input.exceedingBorrowingCosts - disallowedInterest) / interestBarrier, 4) : 0;

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Store ATAD ILR working computation'];

  if (disallowedInterest > 0) {
    decision = disallowedInterest > input.ebitda * 0.2 ? 'refused' : 'review';
    reasons.push('Interest exceeds limitation threshold.');
    approvals.push(APPROVER_HEAD_OF_TAX);
    nextSteps.unshift('Assess carry forward of disallowed interest.');
  }

  return {
    module: 'tax.mt.atad_ilr',
    metrics: {
      interestBarrier,
      disallowedInterest,
      utilisation,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      interestBarrier,
      disallowedInterest,
      utilisation,
    },
    evidence: {
      safeHarbour,
    },
  };
}

export interface FiscalUnityInput {
  parentProfit: number;
  subsidiaryProfit: number;
  adjustments?: number;
  elections?: number;
}

export interface FiscalUnityMetrics {
  consolidatedProfit: number;
  poolingBenefit: number;
}

export function assessFiscalUnity(input: FiscalUnityInput): CalculatorResult<FiscalUnityMetrics> {
  const adjustments = input.adjustments ?? 0;
  const elections = input.elections ?? 0;
  const consolidatedProfit = round(input.parentProfit + input.subsidiaryProfit + adjustments);
  const poolingBenefit = round(Math.max(0, elections - Math.max(0, consolidatedProfit)));

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Attach fiscal unity election statements'];

  if (poolingBenefit > 0) {
    decision = 'review';
    reasons.push('Pooling benefit claimed; requires manager confirmation.');
    approvals.push(APPROVER_GROUP_TAX);
    nextSteps.unshift('Validate pooling computations against statutory forms.');
  }

  if (consolidatedProfit < 0) {
    decision = 'refused';
    reasons.push('Consolidated position is in loss.');
    if (!approvals.includes(APPROVER_HEAD_OF_TAX)) {
      approvals.push(APPROVER_HEAD_OF_TAX);
    }
    nextSteps.unshift('Review loss utilisation before fiscal unity submission.');
  }

  return {
    module: 'tax.mt.fiscal_unity',
    metrics: {
      consolidatedProfit,
      poolingBenefit,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      consolidatedProfit,
      poolingBenefit,
    },
    evidence: {
      adjustments,
      elections,
    },
  };
}

export interface VatPeriodInput {
  sales: number;
  salesVatRate: number;
  purchases: number;
  purchaseVatRate: number;
  scheme: 'domestic' | 'oss' | 'ioss';
}

export interface VatPeriodMetrics {
  outputVat: number;
  inputVat: number;
  netVat: number;
}

export function prepareVatPeriod(input: VatPeriodInput): CalculatorResult<VatPeriodMetrics> {
  const outputVat = round(input.sales * input.salesVatRate);
  const inputVat = round(input.purchases * input.purchaseVatRate);
  const netVat = round(outputVat - inputVat);

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Upload supporting invoices and EC sales list'];

  if (netVat < 0) {
    decision = 'review';
    reasons.push('VAT refund position detected.');
    approvals.push(APPROVER_HEAD_OF_TAX);
    nextSteps.unshift('Trigger refund evidence checklist.');
  } else if (netVat > 50000) {
    decision = 'review';
    reasons.push('Net VAT exceeds automated payment threshold.');
    approvals.push(APPROVER_HEAD_OF_TAX);
  }

  if (input.scheme !== 'domestic') {
    if (!reasons.includes('Non-domestic scheme in use.')) {
      reasons.push('Non-domestic scheme in use.');
    }
    if (!approvals.includes(APPROVER_GROUP_TAX)) {
      approvals.push(APPROVER_GROUP_TAX);
    }
    if (decision === 'approved') {
      decision = 'review';
    }
    nextSteps.unshift('Confirm OSS/IOSS country breakdown.');
  }

  return {
    module: 'tax.eu.vat',
    metrics: {
      outputVat,
      inputVat,
      netVat,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      outputVat,
      inputVat,
      netVat,
    },
    evidence: {
      scheme: input.scheme,
    },
  };
}

export interface Dac6Arrangement {
  id: string;
  hallmarkCategories: string[];
  crossBorder: boolean;
  mainBenefit: boolean;
}

export interface Dac6ScanMetrics {
  flaggedArrangements: Array<{
    id: string;
    riskScore: number;
    hallmarks: string[];
  }>;
  totalFlagged: number;
  highestScore: number;
}

export function scanDac6(arrangements: Dac6Arrangement[]): CalculatorResult<Dac6ScanMetrics> {
  const flagged: Array<{ id: string; riskScore: number; hallmarks: string[] }> = [];

  arrangements.forEach((arrangement) => {
    const baseScore = arrangement.hallmarkCategories.length;
    const crossBorderScore = arrangement.crossBorder ? 2 : 0;
    const mainBenefitScore = arrangement.mainBenefit ? 2 : 0;
    const riskScore = round(baseScore + crossBorderScore + mainBenefitScore, 1);

    if (riskScore >= 4) {
      flagged.push({
        id: arrangement.id,
        riskScore,
        hallmarks: arrangement.hallmarkCategories,
      });
    }
  });

  const totalFlagged = flagged.length;
  const highestScore = flagged.reduce((max, entry) => Math.max(max, entry.riskScore), 0);

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Archive arrangement evidence and hallmarks assessment'];

  if (totalFlagged > 0) {
    decision = totalFlagged > 2 ? 'refused' : 'review';
    reasons.push(`${totalFlagged} arrangements exceeded DAC6 automated threshold.`);
    approvals.push(APPROVER_GROUP_TAX);
    nextSteps.unshift('Prepare DAC6 disclosure pack for legal review.');
  }

  return {
    module: 'tax.eu.dac6',
    metrics: {
      flaggedArrangements: flagged,
      totalFlagged,
      highestScore,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      totalFlagged,
      highestScore,
    },
    evidence: {
      evaluated: arrangements.length,
    },
  };
}

export interface PillarTwoJurisdiction {
  name: string;
  globeIncome: number;
  coveredTaxes: number;
}

export interface PillarTwoMetrics {
  jurisdictions: Array<{
    name: string;
    effectiveRate: number;
    topUpTax: number;
  }>;
  aggregateTopUp: number;
}

export function computePillarTwo(jurisdictions: PillarTwoJurisdiction[]): CalculatorResult<PillarTwoMetrics> {
  const detail = jurisdictions.map((item) => {
    const income = item.globeIncome <= 0 ? Math.max(item.globeIncome, 0) : item.globeIncome;
    const effectiveRate = income > 0 ? round(item.coveredTaxes / income, 4) : 0;
    const topUpTax = income > 0 && effectiveRate < 0.15 ? round((0.15 - effectiveRate) * income) : 0;
    return {
      name: item.name,
      effectiveRate,
      topUpTax,
    };
  });

  const aggregateTopUp = round(detail.reduce((sum, row) => sum + row.topUpTax, 0));
  const highestTopUp = detail.reduce((max, row) => Math.max(max, row.topUpTax), 0);

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Refresh jurisdictional data for next close'];

  if (aggregateTopUp > 0) {
    decision = aggregateTopUp > 500000 ? 'refused' : 'review';
    reasons.push('Top-up tax identified for one or more jurisdictions.');
    approvals.push(APPROVER_GROUP_TAX);
    if (aggregateTopUp > 500000) {
      nextSteps.unshift('Launch Pillar Two response war room.');
    } else {
      nextSteps.unshift('Confirm safe harbour eligibility.');
    }
  }

  return {
    module: 'tax.eu.pillar_two',
    metrics: {
      jurisdictions: detail,
      aggregateTopUp,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      aggregateTopUp,
      highestTopUp,
    },
    evidence: {
      jurisdictions: jurisdictions.length,
    },
  };
}

export interface TreatyResolverInput {
  residenceCountry: string;
  sourceCountry: string;
  issue: 'double_taxation' | 'permanent_establishment' | 'withholding_rate';
  hasMapAccess: boolean;
  apaRequested: boolean;
}

export interface TreatyResolverMetrics {
  recommendedRoute: string;
  escalationLevel: string;
}

export function resolveTreaty(input: TreatyResolverInput): CalculatorResult<TreatyResolverMetrics> {
  let recommendedRoute = 'Apply domestic relief provisions';
  let escalationLevel = 'Business unit';

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Share recommendation with cross-border tax team'];

  if (input.issue === 'double_taxation') {
    if (input.hasMapAccess) {
      recommendedRoute = 'Initiate Mutual Agreement Procedure';
      escalationLevel = 'Competent authority';
      nextSteps.unshift('Compile MAP position paper.');
    } else {
      decision = 'review';
      recommendedRoute = 'Escalate through bilateral negotiation';
      escalationLevel = 'Executive tax leadership';
      reasons.push('MAP unavailable for the jurisdiction pair.');
      approvals.push(APPROVER_GROUP_TAX);
      nextSteps.unshift('Engage external counsel for bilateral talks.');
    }
  }

  if (input.issue === 'permanent_establishment') {
    recommendedRoute = 'Assess PE exposure with local advisors';
    escalationLevel = 'Regional tax manager';
    decision = 'review';
    reasons.push('Permanent establishment exposure requires manual scoping.');
    approvals.push(APPROVER_HEAD_OF_TAX);
  }

  if (input.apaRequested) {
    decision = decision === 'refused' ? 'refused' : 'review';
    if (!reasons.includes('Advance Pricing Agreement requested.')) {
      reasons.push('Advance Pricing Agreement requested.');
    }
    if (!approvals.includes(APPROVER_GROUP_TAX)) {
      approvals.push(APPROVER_GROUP_TAX);
    }
    nextSteps.unshift('Coordinate APA feasibility assessment.');
  }

  return {
    module: 'tax.intl.treaty',
    metrics: {
      recommendedRoute,
      escalationLevel,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      hasMapAccess: input.hasMapAccess ? 1 : 0,
      apaRequested: input.apaRequested ? 1 : 0,
    },
    evidence: {
      residenceCountry: input.residenceCountry,
      sourceCountry: input.sourceCountry,
    },
  };
}

export interface UsGiltiInput {
  testedIncome: number;
  qbai: number;
  interestExpense?: number;
  taxRate: number;
}

export interface UsGiltiMetrics {
  giltiBase: number;
  giltiTax: number;
  deemedIntangibleIncome: number;
}

export function computeUsGilti(input: UsGiltiInput): CalculatorResult<UsGiltiMetrics> {
  const interestExpense = input.interestExpense ?? 0;
  const netTestedIncome = input.testedIncome - interestExpense;
  const deemedIntangibleIncome = round(netTestedIncome - 0.1 * input.qbai);
  const giltiBase = round(Math.max(0, deemedIntangibleIncome));
  const giltiTax = round(giltiBase * input.taxRate);

  let decision: Decision = 'approved';
  const reasons: string[] = [];
  const approvals: string[] = [];
  const nextSteps: string[] = ['Sync results with US international tax team'];

  if (giltiBase === 0) {
    decision = 'refused';
    reasons.push('No GILTI inclusion calculated.');
    approvals.push(APPROVER_HEAD_OF_TAX);
    nextSteps.unshift('Validate tested income and QBAI inputs.');
  } else if (giltiTax > 250000) {
    decision = 'review';
    reasons.push('GILTI liability above automated threshold.');
    approvals.push(APPROVER_GROUP_TAX);
  }

  return {
    module: 'tax.us.gilti',
    metrics: {
      giltiBase,
      giltiTax,
      deemedIntangibleIncome,
    },
    workflow: workflow(decision, reasons, approvals, nextSteps),
    telemetry: {
      giltiBase,
      giltiTax,
    },
    evidence: {
      qbai: input.qbai,
      interestExpense,
    },
  };
}
