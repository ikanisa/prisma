export type HallmarkCategory = 'A' | 'B' | 'C' | 'D' | 'E';

export type Dac6Hallmark = {
  category: HallmarkCategory;
  code: string;
  mainBenefitTest?: boolean;
  description?: string;
};

export type Dac6Inputs = {
  arrangementReference: string;
  description?: string;
  firstStepDate?: string;
  participants: Array<{
    name: string;
    role: 'INTERMEDIARY' | 'RELEVANT_TAXPAYER' | 'ASSOCIATED_ENTERPRISE';
    jurisdiction?: string;
    tin?: string;
  }>;
  hallmarks: Dac6Hallmark[];
  mainBenefitIndicators?: {
    confidentialityClause?: boolean;
    contingentFee?: boolean;
    standardizedDocumentation?: boolean;
  };
  hallmarkIndicators?: {
    crossBorderDoubleDeduction?: boolean;
    transferPricingHardToValueIntangibles?: boolean;
    transferPricingCrossBorderTransfer?: boolean;
  };
  notes?: string;
};

export type Dac6Assessment = {
  arrangementReference: string;
  primaryHallmarks: Dac6Hallmark[];
  additionalHallmarks: Dac6Hallmark[];
  mainBenefitTestMet: boolean;
  reportingRequired: boolean;
  reasons: string[];
};

const MAIN_BENEFIT_HALLMARKS: Record<string, HallmarkCategory> = {
  'A1': 'A',
  'A2': 'A',
  'A3': 'A',
  'B1': 'B',
  'B2': 'B',
  'B3': 'B',
};

const AUTOMATIC_HALLMARKS: Record<string, HallmarkCategory> = {
  'C1': 'C',
  'C1(b)(i)': 'C',
  'C1(b)(ii)': 'C',
  'C1(c)': 'C',
  'C2': 'C',
  'C3': 'C',
  'C4': 'C',
  'D1': 'D',
  'D1(3)': 'D',
  'D2': 'D',
  'E1': 'E',
  'E2': 'E',
  'E3': 'E',
};

function requiresMainBenefit(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(MAIN_BENEFIT_HALLMARKS, code.toUpperCase());
}

export function assessDac6(inputs: Dac6Inputs): Dac6Assessment {
  const reasons: string[] = [];
  const canonicalHallmarks = inputs.hallmarks.map((hallmark) => ({
    ...hallmark,
    category: hallmark.category.toUpperCase() as HallmarkCategory,
    code: hallmark.code.toUpperCase(),
    mainBenefitTest: Boolean(hallmark.mainBenefitTest),
  }));

  const primaryHallmarks = canonicalHallmarks.filter((hallmark) => AUTOMATIC_HALLMARKS[hallmark.code]);
  const mbHallmarks = canonicalHallmarks.filter((hallmark) => requiresMainBenefit(hallmark.code));

  const mainBenefitTestMet = Boolean(
    inputs.mainBenefitIndicators?.confidentialityClause ||
      inputs.mainBenefitIndicators?.contingentFee ||
      inputs.mainBenefitIndicators?.standardizedDocumentation ||
      mbHallmarks.some((hallmark) => hallmark.mainBenefitTest)
  );

  const automaticHallmarkPresent = primaryHallmarks.length > 0;
  const mbHallmarkPresent = mbHallmarks.length > 0 && mainBenefitTestMet;

  if (automaticHallmarkPresent) {
    reasons.push('Automatic hallmark triggered (Category C/D/E).');
  }
  if (mbHallmarkPresent) {
    reasons.push('Hallmark requiring main benefit test met.');
  }
  if (canonicalHallmarks.length === 0) {
    reasons.push('No hallmarks flagged.');
  }

  const reportingRequired = automaticHallmarkPresent || mbHallmarkPresent;

  return {
    arrangementReference: inputs.arrangementReference,
    primaryHallmarks,
    additionalHallmarks: canonicalHallmarks.filter((hallmark) => !AUTOMATIC_HALLMARKS[hallmark.code]),
    mainBenefitTestMet,
    reportingRequired,
    reasons,
  } satisfies Dac6Assessment;
}
