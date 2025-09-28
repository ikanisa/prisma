export type NidInput = {
  equityBase: number;
  riskFreeRate?: number;
  riskPremium?: number;
  referenceRateOverride?: number;
  priorDeduction?: number;
  chargeableIncomeBeforeNid?: number;
  capRatio?: number;
};

export type NidResult = {
  referenceRate: number;
  grossDeduction: number;
  cappedDeduction: number;
  deductionAfterCarryforward: number;
  adjustmentAmount: number;
};

export function calculateNid(input: NidInput): NidResult {
  const equity = Number(input.equityBase ?? 0);
  const riskFreeRate = Number.isFinite(input.riskFreeRate) ? Number(input.riskFreeRate) : 0;
  const riskPremium = Number.isFinite(input.riskPremium) ? Number(input.riskPremium) : 0.05;
  const referenceRate = Number.isFinite(input.referenceRateOverride)
    ? Number(input.referenceRateOverride)
    : riskFreeRate + riskPremium;

  const grossDeduction = Math.max(equity * referenceRate, 0);

  const capRatio = Number.isFinite(input.capRatio) ? Number(input.capRatio) : 0.9;
  const incomeCap = Number.isFinite(input.chargeableIncomeBeforeNid)
    ? Math.max(Number(input.chargeableIncomeBeforeNid) * capRatio, 0)
    : Number.POSITIVE_INFINITY;
  const cappedDeduction = Math.min(grossDeduction, incomeCap);

  const priorDeduction = Number.isFinite(input.priorDeduction) ? Math.max(Number(input.priorDeduction), 0) : 0;
  const deductionAfterCarryforward = Math.max(cappedDeduction - priorDeduction, 0);

  return {
    referenceRate,
    grossDeduction,
    cappedDeduction,
    deductionAfterCarryforward,
    adjustmentAmount: -deductionAfterCarryforward,
  } satisfies NidResult;
}

export type PatentBoxInput = {
  qualifyingIpIncome: number;
  routineReturnRate?: number;
  qualifyingExpenditure: number;
  overallExpenditure: number;
  upliftCap?: number;
  deductionRate?: number;
};

export type PatentBoxResult = {
  routineReturn: number;
  uplift: number;
  nexusFraction: number;
  deductionBase: number;
  deductionAmount: number;
  adjustmentAmount: number;
};

export function calculatePatentBox(input: PatentBoxInput): PatentBoxResult {
  const qualifyingIncome = Math.max(Number(input.qualifyingIpIncome ?? 0), 0);
  const routineReturnRate = Number.isFinite(input.routineReturnRate) ? Number(input.routineReturnRate) : 0.1;
  const qualifyingExpenditure = Math.max(Number(input.qualifyingExpenditure ?? 0), 0);
  const overallExpenditure = Math.max(Number(input.overallExpenditure ?? 0), 0);
  const upliftCap = Number.isFinite(input.upliftCap) ? Math.max(Number(input.upliftCap), 0) : 0.3;
  const deductionRate = Number.isFinite(input.deductionRate) ? Number(input.deductionRate) : 0.95;

  const routineReturn = qualifyingIncome * routineReturnRate;
  const deductionBase = Math.max(qualifyingIncome - routineReturn, 0);

  let uplift = 0;
  if (overallExpenditure > 0) {
    const maxUplift = Math.max(overallExpenditure - qualifyingExpenditure, 0);
    uplift = Math.min(qualifyingExpenditure * upliftCap, maxUplift);
  }

  const nexusDenominator = overallExpenditure > 0 ? overallExpenditure : 1;
  const nexusFraction = Math.min(1, (qualifyingExpenditure + uplift) / nexusDenominator);

  const deductionAmount = deductionBase * nexusFraction * deductionRate;

  return {
    routineReturn,
    uplift,
    nexusFraction,
    deductionBase,
    deductionAmount,
    adjustmentAmount: -deductionAmount,
  } satisfies PatentBoxResult;
}

export type InterestLimitationInput = {
  exceedingBorrowingCosts: number;
  taxEbitda: number;
  standaloneAllowance?: number;
  safeHarbourAmount?: number;
  carryforwardInterest?: number;
  carryforwardCapacity?: number;
  disallowedCarryforward?: number;
};

export type InterestLimitationResult = {
  netBorrowingCosts: number;
  capacityAvailable: number;
  allowedInterest: number;
  disallowedInterest: number;
  updatedCarryforwardInterest: number;
  updatedCarryforwardCapacity: number;
  adjustmentAmount: number;
};

export function calculateInterestLimitation(input: InterestLimitationInput): InterestLimitationResult {
  const ebc = Math.max(Number(input.exceedingBorrowingCosts ?? 0), 0);
  const taxEbitda = Math.max(Number(input.taxEbitda ?? 0), 0);
  const standaloneAllowance = Math.max(Number(input.standaloneAllowance ?? 0), 0);
  const safeHarbour = Math.max(Number(input.safeHarbourAmount ?? 3_000_000), 0);
  const carryforwardInterest = Math.max(Number(input.carryforwardInterest ?? 0), 0);
  const carryforwardCapacity = Math.max(Number(input.carryforwardCapacity ?? 0), 0);
  const disallowedCarryforward = Math.max(Number(input.disallowedCarryforward ?? 0), 0);

  const baseCapacity = Math.max(taxEbitda * 0.3, safeHarbour);
  const totalCapacity = baseCapacity + carryforwardCapacity + standaloneAllowance;

  const allowedInterest = Math.min(ebc + carryforwardInterest, totalCapacity);
  const disallowedCurrent = Math.max(ebc + carryforwardInterest - totalCapacity, 0);
  const disallowedInterest = disallowedCurrent + disallowedCarryforward;

  const remainingCarryforwardCapacity = Math.max(totalCapacity - (ebc + carryforwardInterest), 0);
  const updatedCarryforwardCapacity = remainingCarryforwardCapacity;
  const updatedCarryforwardInterest = disallowedInterest;

  return {
    netBorrowingCosts: ebc,
    capacityAvailable: totalCapacity,
    allowedInterest,
    disallowedInterest,
    updatedCarryforwardInterest,
    updatedCarryforwardCapacity,
    adjustmentAmount: disallowedInterest,
  } satisfies InterestLimitationResult;
}

export type CfcInput = {
  cfcProfit: number;
  foreignTaxPaid: number;
  foreignJurisdictionRate?: number;
  domesticRate?: number;
  participationPercentage: number;
  profitAttributionRatio?: number;
};

export type CfcResult = {
  effectiveForeignRate: number;
  domesticRate: number;
  inclusionAmount: number;
  taxCreditEligible: number;
  adjustmentAmount: number;
};

export function calculateCfcInclusion(input: CfcInput): CfcResult {
  const profit = Math.max(Number(input.cfcProfit ?? 0), 0);
  const foreignTax = Math.max(Number(input.foreignTaxPaid ?? 0), 0);
  const participation = Math.min(Math.max(Number(input.participationPercentage ?? 1), 0), 1);
  const profitRatio = Math.min(Math.max(Number(input.profitAttributionRatio ?? 1), 0), 1);
  const effectiveForeignRate = profit > 0 ? foreignTax / profit : 0;
  const domesticRate = Math.max(Number(input.domesticRate ?? 0.35), 0);
  const minimumForeignRate = Math.max(Number(input.foreignJurisdictionRate ?? effectiveForeignRate), 0);

  const attributableProfit = profit * participation * profitRatio;
  const inclusionAmount = Math.max(attributableProfit * Math.max(domesticRate - minimumForeignRate, 0), 0);
  const taxCreditEligible = Math.min(foreignTax * participation * profitRatio, inclusionAmount);

  return {
    effectiveForeignRate,
    domesticRate,
    inclusionAmount,
    taxCreditEligible,
    adjustmentAmount: inclusionAmount,
  } satisfies CfcResult;
}

export type FiscalUnityMemberInput = {
  taxEntityId: string;
  name?: string;
  chargeableIncome: number;
  taxCredits?: number;
  participation?: number;
};

export type FiscalUnityInput = {
  parentTaxEntityId: string;
  period: string;
  members: FiscalUnityMemberInput[];
  adjustments?: number;
  taxRate?: number;
  openingTaxAccount?: number;
  paymentsMade?: number;
};

export type FiscalUnityResult = {
  totalChargeableIncome: number;
  taxRate: number;
  totalAdjustments: number;
  consolidatedCit: number;
  totalTaxCredits: number;
  netTaxPayable: number;
  closingTaxAccount: number;
  memberAllocations: Array<{
    taxEntityId: string;
    name?: string;
    share: number;
    allocatedTax: number;
  }>;
  adjustmentAmount: number;
};

export function calculateFiscalUnity(input: FiscalUnityInput): FiscalUnityResult {
  const taxRate = Number.isFinite(input.taxRate) ? Math.max(Number(input.taxRate), 0) : 0.35;
  const adjustments = Number.isFinite(input.adjustments) ? Number(input.adjustments) : 0;
  const openingTaxAccount = Number.isFinite(input.openingTaxAccount) ? Number(input.openingTaxAccount) : 0;
  const paymentsMade = Number.isFinite(input.paymentsMade) ? Number(input.paymentsMade) : 0;

  const members = Array.isArray(input.members) ? input.members : [];
  const totalChargeableIncome = members.reduce((sum, member) => sum + Math.max(Number(member.chargeableIncome ?? 0), 0), 0);
  const totalAdjustments = adjustments;
  const consolidatedCit = Math.max((totalChargeableIncome + totalAdjustments) * taxRate, 0);
  const totalTaxCredits = members.reduce((sum, member) => sum + Math.max(Number(member.taxCredits ?? 0), 0), 0);
  const netTaxPayable = Math.max(consolidatedCit - totalTaxCredits, 0);
  const closingTaxAccount = openingTaxAccount + netTaxPayable - paymentsMade;

  const incomeForAllocation = totalChargeableIncome === 0 ? 1 : totalChargeableIncome;
  const memberAllocations = members.map((member) => {
    const income = Math.max(Number(member.chargeableIncome ?? 0), 0);
    const share = income / incomeForAllocation;
    return {
      taxEntityId: member.taxEntityId,
      name: member.name,
      share,
      allocatedTax: netTaxPayable * share,
    };
  });

  return {
    totalChargeableIncome,
    taxRate,
    totalAdjustments,
    consolidatedCit,
    totalTaxCredits,
    netTaxPayable,
    closingTaxAccount,
    memberAllocations,
    adjustmentAmount: netTaxPayable,
  } satisfies FiscalUnityResult;
}

export type VatReturnInput = {
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
};

export type VatReturnResult = {
  taxableOutputs: number;
  outputVat: number;
  inputVat: number;
  netVatDue: number;
  manualAdjustments: number;
  netPayableAfterAdjustments: number;
  adjustmentAmount: number;
};

export function calculateVatReturn(input: VatReturnInput): VatReturnResult {
  const outputsStandard = Math.max(Number(input.outputsStandard ?? 0), 0);
  const outputsReduced = Math.max(Number(input.outputsReduced ?? 0), 0);
  const inputsStandard = Math.max(Number(input.inputsStandard ?? 0), 0);
  const inputsCapitalGoods = Math.max(Number(input.inputsCapitalGoods ?? 0), 0);
  const recoveryRate = Number.isFinite(input.inputVatRecoveryRate)
    ? Math.min(Math.max(Number(input.inputVatRecoveryRate), 0), 1)
    : 1;
  const intraCommunityAcq = Math.max(Number(input.intraCommunityAcquisitions ?? 0), 0);
  const distanceSales = Math.max(Number(input.distanceSales ?? 0), 0);
  const manualAdjustments = Number(input.manualAdjustments ?? 0);

  const standardRateVat = outputsStandard * 0.18; // Malta standard rate 18%
  const reducedRateVat = outputsReduced * 0.07; // assume reduced 7%
  const icaVat = intraCommunityAcq * 0.18;
  const distanceSalesVat = distanceSales * 0.18;

  const outputVat = standardRateVat + reducedRateVat + icaVat + distanceSalesVat;
  const inputVat = (inputsStandard + inputsCapitalGoods) * recoveryRate * 0.18;

  const taxableOutputs = outputsStandard + outputsReduced + intraCommunityAcq + distanceSales;
  const netVatDue = Math.max(outputVat - inputVat, 0);
  const netPayableAfterAdjustments = netVatDue + manualAdjustments;

  return {
    taxableOutputs,
    outputVat,
    inputVat,
    netVatDue,
    manualAdjustments,
    netPayableAfterAdjustments,
    adjustmentAmount: netPayableAfterAdjustments,
  } satisfies VatReturnResult;
}

export type PillarTwoJurisdictionInput = {
  taxEntityId: string;
  jurisdiction: string;
  globeIncome: number;
  coveredTaxes: number;
  substanceCarveOut?: number;
  qdmtPaid?: number;
  ownershipPercentage?: number;
  safeHarbourThreshold?: number;
};

export type PillarTwoInput = {
  rootTaxEntityId: string;
  period: string;
  jurisdictions: PillarTwoJurisdictionInput[];
  minimumRate?: number;
};

export type PillarTwoJurisdictionResult = {
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
};

export type PillarTwoResult = {
  jurisdictions: PillarTwoJurisdictionResult[];
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
};

export function calculatePillarTwo(input: PillarTwoInput): PillarTwoResult {
  const minimumRate = Number.isFinite(input.minimumRate) ? Math.max(Number(input.minimumRate), 0) : 0.15;

  const jurisdictions = input.jurisdictions.map<PillarTwoJurisdictionResult>((jurisdiction) => {
    const income = Math.max(Number(jurisdiction.globeIncome ?? 0), 0);
    const taxes = Math.max(Number(jurisdiction.coveredTaxes ?? 0), 0);
    const substanceCarveOut = Math.max(Number(jurisdiction.substanceCarveOut ?? 0), 0);
    const qdmtPaid = Math.max(Number(jurisdiction.qdmtPaid ?? 0), 0);
    const ownershipPercentage = (() => {
      const value = Number(jurisdiction.ownershipPercentage);
      if (!Number.isFinite(value)) return 1;
      if (value <= 0) return 0;
      return Math.min(value, 1);
    })();
    const safeHarbourThreshold = Math.max(Number(jurisdiction.safeHarbourThreshold ?? 0), 0);

    const effectiveTaxRate = income > 0 ? taxes / income : 0;
    const excessProfit = Math.max(income - substanceCarveOut, 0);
    const safeHarbour = income <= safeHarbourThreshold || effectiveTaxRate >= minimumRate || excessProfit === 0;

    const topUpRate = Math.max(0, minimumRate - effectiveTaxRate);
    const rawTopUpTax = safeHarbour ? 0 : topUpRate * excessProfit;
    const topUpTax = Number.isFinite(rawTopUpTax) ? rawTopUpTax : 0;
    const qdmtCredit = Math.min(topUpTax, qdmtPaid);
    const residualTopUp = Math.max(topUpTax - qdmtCredit, 0);
    const iirShare = residualTopUp * ownershipPercentage;

    return {
      taxEntityId: jurisdiction.taxEntityId,
      jurisdiction: jurisdiction.jurisdiction,
      globeIncome: income,
      coveredTaxes: taxes,
      substanceCarveOut,
      effectiveTaxRate,
      excessProfit,
      topUpTax,
      qdmtCredit,
      residualTopUp,
      iirShare,
      ownershipPercentage,
      appliedSafeHarbour: safeHarbour,
    } satisfies PillarTwoJurisdictionResult;
  });

  const totalTopUpTax = jurisdictions.reduce((sum, entry) => sum + entry.topUpTax, 0);
  const qdmtTopUpTax = jurisdictions.reduce((sum, entry) => sum + entry.qdmtCredit, 0);
  const iirTopUpTax = jurisdictions.reduce((sum, entry) => sum + entry.iirShare, 0);

  const safeHarbourApplied = jurisdictions
    .filter((entry) => entry.appliedSafeHarbour)
    .map((entry) => ({ taxEntityId: entry.taxEntityId, jurisdiction: entry.jurisdiction }));

  const gir = {
    rootTaxEntityId: input.rootTaxEntityId,
    period: input.period,
    jurisdictions: jurisdictions.map((entry) => ({
      jurisdiction: entry.jurisdiction,
      topUpTax: entry.topUpTax,
      qdmtCredit: entry.qdmtCredit,
      residualTopUp: entry.residualTopUp,
    })),
    totals: {
      totalTopUpTax,
      qdmtTopUpTax,
      iirTopUpTax,
    },
  };

  return {
    jurisdictions,
    totalTopUpTax,
    qdmtTopUpTax,
    iirTopUpTax,
    minimumRate,
    safeHarbourApplied,
    gir,
  } satisfies PillarTwoResult;
}

export type TreatyWhtInput = {
  grossAmount: number;
  domesticRate: number;
  treatyRate: number;
};

export type TreatyWhtResult = {
  domesticRate: number;
  treatyRate: number;
  reliefRate: number;
  withholdingBefore: number;
  withholdingAfter: number;
  reliefAmount: number;
};

const normalizeRate = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value > 1) return Math.min(value / 100, 1);
  return Math.min(value, 1);
};

export function calculateTreatyWht(input: TreatyWhtInput): TreatyWhtResult {
  const grossAmount = Math.max(Number(input.grossAmount ?? 0), 0);
  const domesticRate = normalizeRate(Number(input.domesticRate ?? 0));
  const treatyRate = normalizeRate(Number(input.treatyRate ?? 0));
  const cappedTreatyRate = Math.min(treatyRate, domesticRate);

  const withholdingBefore = grossAmount * domesticRate;
  const withholdingAfter = grossAmount * cappedTreatyRate;
  const reliefAmount = Math.max(withholdingBefore - withholdingAfter, 0);
  const reliefRate = domesticRate - cappedTreatyRate;

  return {
    domesticRate,
    treatyRate: cappedTreatyRate,
    reliefRate,
    withholdingBefore,
    withholdingAfter,
    reliefAmount,
  } satisfies TreatyWhtResult;
}

export type GiltiInput = {
  testedIncome: number;
  testedLoss?: number;
  qbaI: number;
  interestExpense?: number;
  foreignTaxesPaid?: number;
  ftcLimit?: number;
  corporateRate?: number;
  section250DeductionRate?: number;
  ftcPercentage?: number;
};

export type GiltiResult = {
  netTestedIncome: number;
  deemedTangibleIncomeReturn: number;
  giltiBase: number;
  section250Deduction: number;
  taxableGilti: number;
  usTaxLiability: number;
  allowableForeignTaxCredit: number;
  netGiltiTax: number;
};

export function calculateGilti(input: GiltiInput): GiltiResult {
  const corporateRate = Number.isFinite(input.corporateRate) ? Math.max(Number(input.corporateRate), 0) : 0.21;
  const section250Rate = Number.isFinite(input.section250DeductionRate)
    ? Math.max(Math.min(Number(input.section250DeductionRate), 1), 0)
    : 0.5;
  const ftcPercentage = Number.isFinite(input.ftcPercentage)
    ? Math.max(Math.min(Number(input.ftcPercentage), 1), 0)
    : 0.8;
  const ftcLimit = Number.isFinite(input.ftcLimit) ? Math.max(Math.min(Number(input.ftcLimit), 1), 0) : 0.8;

  const testedIncome = Math.max(Number(input.testedIncome ?? 0), 0);
  const testedLoss = Math.max(Number(input.testedLoss ?? 0), 0);
  const qbaI = Math.max(Number(input.qbaI ?? 0), 0);
  const interestExpense = Math.max(Number(input.interestExpense ?? 0), 0);
  const foreignTaxesPaid = Math.max(Number(input.foreignTaxesPaid ?? 0), 0);

  const netTestedIncome = Math.max(0, testedIncome - testedLoss);
  const deemedTangibleIncomeReturn = qbaI * 0.10;
  const giltiBase = Math.max(0, netTestedIncome - deemedTangibleIncomeReturn - interestExpense);
  const section250Deduction = giltiBase * section250Rate;
  const taxableGilti = Math.max(0, giltiBase - section250Deduction);
  const usTaxLiability = taxableGilti * corporateRate;
  const ftcCap = usTaxLiability * ftcLimit;
  const allowableForeignTaxCredit = Math.min(foreignTaxesPaid * ftcPercentage, ftcCap);
  const netGiltiTax = Math.max(0, usTaxLiability - allowableForeignTaxCredit);

  return {
    netTestedIncome,
    deemedTangibleIncomeReturn,
    giltiBase,
    section250Deduction,
    taxableGilti,
    usTaxLiability,
    allowableForeignTaxCredit,
    netGiltiTax,
  } satisfies GiltiResult;
}

export type Section163JInput = {
  businessInterestExpense: number;
  businessInterestIncome?: number;
  adjustedTaxableIncome: number;
  floorPlanInterest?: number;
  carryforwardInterest?: number;
};

export type Section163JResult = {
  limitation: number;
  allowedInterest: number;
  disallowedInterest: number;
  updatedCarryforward: number;
};

export function calculateSection163J(input: Section163JInput): Section163JResult {
  const expense = Math.max(Number(input.businessInterestExpense ?? 0), 0);
  const income = Math.max(Number(input.businessInterestIncome ?? 0), 0);
  const ati = Math.max(Number(input.adjustedTaxableIncome ?? 0), 0);
  const floorPlan = Math.max(Number(input.floorPlanInterest ?? 0), 0);
  const carryforward = Math.max(Number(input.carryforwardInterest ?? 0), 0);

  const limitation = Math.max(ati * 0.3 + income + floorPlan, 0);
  const allowedInterest = Math.min(expense + carryforward, limitation);
  const disallowedInterest = Math.max(expense + carryforward - limitation, 0);

  return {
    limitation,
    allowedInterest,
    disallowedInterest,
    updatedCarryforward: disallowedInterest,
  } satisfies Section163JResult;
}

export type CamtInput = {
  adjustedFinancialStatementIncome: number;
  camtCreditCarryforward?: number;
  regularTaxLiability: number;
  camtRate?: number;
};

export type CamtResult = {
  camtBase: number;
  camtLiability: number;
  creditUtilised: number;
  camtTopUp: number;
};

export function calculateCamt(input: CamtInput): CamtResult {
  const camtRate = Number.isFinite(input.camtRate) ? Math.max(Number(input.camtRate), 0) : 0.15;
  const afsi = Math.max(Number(input.adjustedFinancialStatementIncome ?? 0), 0);
  const carryforward = Math.max(Number(input.camtCreditCarryforward ?? 0), 0);
  const regularTax = Math.max(Number(input.regularTaxLiability ?? 0), 0);

  const camtBase = afsi * camtRate;
  const camtLiability = Math.max(0, camtBase - carryforward);
  const camtTopUp = Math.max(0, camtLiability - regularTax);
  const creditUtilised = Math.min(carryforward, Math.max(camtBase - camtLiability, 0));

  return {
    camtBase,
    camtLiability,
    creditUtilised,
    camtTopUp,
  } satisfies CamtResult;
}

export type Excise4501Input = {
  netRepurchase: number;
  permittedExceptions?: number;
  rate?: number;
};

export type Excise4501Result = {
  exciseBase: number;
  exciseTax: number;
};

export function calculateExcise4501(input: Excise4501Input): Excise4501Result {
  const rate = Number.isFinite(input.rate) ? Math.max(Number(input.rate), 0) : 0.01;
  const netRepurchase = Math.max(Number(input.netRepurchase ?? 0), 0);
  const exceptions = Math.max(Number(input.permittedExceptions ?? 0), 0);

  const exciseBase = Math.max(netRepurchase - exceptions, 0);
  const exciseTax = exciseBase * rate;

  return {
    exciseBase,
    exciseTax,
  } satisfies Excise4501Result;
}

export type UsOverlayType = 'GILTI' | '163J' | 'CAMT' | 'EXCISE_4501';

export type UsOverlayResult =
  | ({ overlayType: 'GILTI' } & GiltiResult)
  | ({ overlayType: '163J' } & Section163JResult)
  | ({ overlayType: 'CAMT' } & CamtResult)
  | ({ overlayType: 'EXCISE_4501' } & Excise4501Result);

export type CalculateUsOverlayInput =
  | ({ overlayType: 'GILTI' } & GiltiInput)
  | ({ overlayType: '163J' } & Section163JInput)
  | ({ overlayType: 'CAMT' } & CamtInput)
  | ({ overlayType: 'EXCISE_4501' } & Excise4501Input);

export function calculateUsOverlay(input: CalculateUsOverlayInput): UsOverlayResult {
  switch (input.overlayType) {
    case 'GILTI':
      return { overlayType: 'GILTI', ...calculateGilti(input) } satisfies UsOverlayResult;
    case '163J':
      return { overlayType: '163J', ...calculateSection163J(input) } satisfies UsOverlayResult;
    case 'CAMT':
      return { overlayType: 'CAMT', ...calculateCamt(input) } satisfies UsOverlayResult;
    case 'EXCISE_4501':
    default:
      return { overlayType: 'EXCISE_4501', ...calculateExcise4501(input) } satisfies UsOverlayResult;
  }
}
