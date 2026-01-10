/**
 * Malta Tax System Type Definitions
 * 
 * Comprehensive types for Malta's tax system including:
 * - Corporate income tax with full imputation
 * - VAT system with multiple rates
 * - Participation exemption
 * - Double taxation relief (Treaty, Unilateral, FRFTC)
 * - 2025 FITWI regime
 * 
 * Based on Income Tax Act (Cap. 123) and VAT Act (XXIII/1998)
 */

// ============================================================================
// CORE ENUMS & LITERALS
// ============================================================================

/** Malta tax account types for the full imputation system */
export type MaltaTaxAccountType = 'MTA' | 'FIA' | 'IPA' | 'FTA' | 'UA';

/** Refund rate types available to shareholders */
export type MaltaRefundRateType = 'six_sevenths' | 'five_sevenths' | 'two_thirds' | 'none';

/** Double taxation relief methods */
export type DoubleTaxReliefMethod = 'treaty' | 'unilateral' | 'frftc';

/** Income types for tax classification */
export type MaltaIncomeType =
    | 'trading_malta'
    | 'trading_foreign'
    | 'dividend'
    | 'interest'
    | 'royalty'
    | 'capital_gain'
    | 'rental'
    | 'immovable_property';

/** VAT registration types under Malta law */
export type MaltaVATRegistrationType = 'Article10' | 'Article11' | 'Article11A' | 'Article11B' | 'Article12';

/** Transaction types for VAT */
export type VATTransactionType = 'sale' | 'purchase' | 'import' | 'export' | 'intra_eu_supply' | 'intra_eu_acquisition';

/** Customer types for VAT */
export type CustomerType = 'b2b' | 'b2c';

/** Participation exemption qualification route */
export type ParticipationExemptionRoute = 'equity_holding' | 'investment_value';

// ============================================================================
// TAX ACCOUNT TYPES
// ============================================================================

/**
 * Malta Tax Account
 * 
 * Malta's full imputation system allocates income to five tax accounts:
 * - MTA: Maltese Taxed Account (Malta-source trading income)
 * - FIA: Foreign Income Account (foreign dividends, interest, royalties, gains)
 * - IPA: Immovable Property Account (Malta property income)
 * - FTA: Final Tax Account (income subject to final withholding)
 * - UA: Untaxed Account (exempt income, capital contributions)
 */
export interface MaltaTaxAccount {
    type: MaltaTaxAccountType;
    description: string;
    income: number;
    taxPaid: number;
    refundRate: MaltaRefundRateType;
    refundAmount: number;
    netTaxCost: number;
    effectiveRate: number;
}

/**
 * Tax Account Allocation Result
 */
export interface TaxAccountAllocation {
    accounts: Record<MaltaTaxAccountType, MaltaTaxAccount>;
    totalIncome: number;
    totalTaxPaid: number;
    totalRefundAvailable: number;
    netEffectiveTax: number;
    overallEffectiveRate: number;
}

// ============================================================================
// REFUND SYSTEM TYPES
// ============================================================================

/**
 * Shareholder Refund Configuration
 */
export interface RefundRateConfig {
    rate: MaltaRefundRateType;
    numerator: number;
    denominator: number;
    decimalValue: number;
    effectiveRate: number;
    applicableTo: string[];
}

/**
 * Shareholder Refund Calculation
 */
export interface ShareholderRefundCalculation {
    dividendAmount: number;
    sourceAccount: MaltaTaxAccountType;
    grossIncome: number;
    taxPaidOnIncome: number;
    refundRate: RefundRateConfig;
    refundAmount: number;
    netTaxCost: number;
    effectiveTaxRate: number;
    shareholderNetReceipt: number;
    claimDeadline: string; // ISO date - 14 days from distribution
}

/**
 * Shareholder Refund Eligibility
 */
export interface RefundEligibility {
    eligible: boolean;
    shareholderId: string;
    isDirectShareholder: boolean;
    beneficialOwnersDisclosed: boolean;
    withinClaimPeriod: boolean;
    errors: string[];
    warnings: string[];
}

// ============================================================================
// CORPORATE TAX TYPES
// ============================================================================

/**
 * Corporate Tax Calculation Request
 */
export interface CorporateTaxRequest {
    chargeableIncome: number;
    incomeBreakdown: IncomeBreakdown;
    companyProfile: CompanyProfile;
    fiscalYear: number;
    fitwiElected?: boolean;
}

/**
 * Income Breakdown for Tax Account Allocation
 */
export interface IncomeBreakdown {
    maltaTradingIncome?: number;
    maltaPropertyIncome?: number;
    foreignIncome?: ForeignIncomeItem[];
    finalTaxIncome?: number;
    exemptIncome?: number;
}

/**
 * Foreign Income Item for FIA Allocation
 */
export interface ForeignIncomeItem {
    type: 'dividend' | 'interest' | 'royalty' | 'capital_gain' | 'business_income';
    sourceCountry: string;
    amount: number;
    foreignTaxPaid?: number;
    doubleTaxReliefClaimed?: boolean;
    treatyExists?: boolean;
}

/**
 * Company Profile for Tax Calculations
 */
export interface CompanyProfile {
    name: string;
    registrationNumber?: string;
    isResident: boolean;
    isDomiciled: boolean;
    shareholderStructure?: string;
    foreignShareholders?: boolean;
    refundsClaimable?: boolean;
    pillarTwoSubject?: boolean;
    groupStructure?: string;
    industry?: string;
    functions?: string;
    keyAssets?: string;
    risksAssumed?: string;
}

/**
 * Corporate Tax Calculation Result (Standard System)
 */
export interface CorporateTaxResult {
    chargeableIncome: number;
    corporateTaxRate: number;
    corporateTaxPayable: number;
    taxAccounts: TaxAccountAllocation;
    refundAnalysis: Record<MaltaTaxAccountType, AccountRefundAnalysis>;
    regime: 'standard_imputation' | 'fitwi_15_percent';
}

/**
 * Per-Account Refund Analysis
 */
export interface AccountRefundAnalysis {
    grossIncome: number;
    taxAt35Percent: number;
    refundRate: number;
    refundAmount: number;
    netTaxCost: number;
    effectiveRatePercent: number;
    refundAvailable: boolean;
    reason?: string;
}

// ============================================================================
// FITWI REGIME TYPES (2025)
// ============================================================================

/**
 * FITWI (Final Income Tax Without Imputation) Calculation
 * 
 * Introduced September 2025
 * - 15% flat rate
 * - No imputation credits
 * - No shareholder refunds
 * - 5-year binding period
 */
export interface FITWICalculation {
    chargeableIncome: number;
    fitwiTaxRate: number; // 15%
    fitwiTax: number;
    estimatedEffectiveStandard: number;
    safeguardTriggered: boolean;
    finalTaxPayable: number;
    regime: 'fitwi_15_percent';
    bindingPeriod: string; // '5 years minimum'
    canRevertAfter: string; // '5 years in standard system'
    suitabilityAnalysis?: FITWISuitabilityAnalysis;
}

/**
 * FITWI Suitability Analysis (AI-powered)
 */
export interface FITWISuitabilityAnalysis {
    recommendation: 'elect_fitwi' | 'stay_standard' | 'case_by_case';
    reasoning: string;
    keyFactors: string[];
    shareholderImpact: string;
    longTermConsiderations: string[];
    pillarTwoImplications?: string;
}

// ============================================================================
// PARTICIPATION EXEMPTION TYPES
// ============================================================================

/**
 * Participation Holding Details
 */
export interface ParticipationHolding {
    subsidiaryName: string;
    equityPercentage: number;
    acquisitionCost: number;
    acquisitionDate: string; // ISO date
    jurisdiction: string; // ISO country code
    votingRightsPercentage?: number;
    profitRightsPercentage?: number;
    liquidationRightsPercentage?: number;
}

/**
 * Subsidiary Financials for Anti-Abuse Tests
 */
export interface SubsidiaryFinancials {
    totalAssets: number;
    totalIncome: number;
    qualifyingInvestments?: {
        equityHoldingsInOtherCompanies?: number;
        immovablePropertyForOwnBusiness?: number;
        intellectualPropertyRights?: number;
    };
    passiveIncome?: {
        interest?: number;
        dividends?: number;
        royalties?: number;
        rentalIncome?: number;
    };
    statutoryTaxRate?: number;
    effectiveTaxRate?: number;
}

/**
 * Participation Exemption Qualification Result
 */
export interface ParticipationExemptionResult {
    qualifies: boolean;
    qualificationRoute: ParticipationExemptionRoute | null;
    antiAbuseTestsPassed: AntiAbuseTestResults;
    reasoning: string;
    recommendedAction: string;
    documentationRequired: string[];
    aiConfidenceScore?: number;
}

/**
 * Anti-Abuse Test Results
 */
export interface AntiAbuseTestResults {
    investmentTest: AntiAbuseTestResult;
    taxTest: AntiAbuseTestResult;
    activeBusinessTest: AntiAbuseTestResult;
    allPassed: boolean;
}

/**
 * Individual Anti-Abuse Test Result
 */
export interface AntiAbuseTestResult {
    passed: boolean;
    percentage?: number;
    threshold?: number;
    jurisdiction?: string;
    statutoryRate?: number;
    safeHarborRate?: number;
    reasoning: string;
}

// ============================================================================
// DOUBLE TAXATION RELIEF TYPES
// ============================================================================

/**
 * Foreign Income for Double Tax Relief
 */
export interface ForeignIncomeForRelief {
    incomeType: 'dividend' | 'interest' | 'royalty' | 'business_income' | 'capital_gain';
    sourceCountry: string;
    grossAmount: number;
    foreignTaxPaid: number;
    treatyExists: boolean;
}

/**
 * Double Taxation Relief Calculation
 */
export interface DoubleTaxReliefResult {
    reliefMethod: DoubleTaxReliefMethod;
    foreignIncomeGross: number;
    foreignTaxPaid: number;
    maltaTaxOnIncome: number;
    reliefAmount: number;
    netMaltaTax: number;
    effectiveRate: number;
    shareholderRefundAvailable: number;
    finalEffectiveRate: number;
}

/**
 * Relief Method Comparison
 */
export interface ReliefMethodComparison {
    recommendedMethod: DoubleTaxReliefMethod;
    allMethods: Record<DoubleTaxReliefMethod, DoubleTaxReliefResult | null>;
    aiReasoning: string;
    documentationRequired: string[];
    complianceNotes: string[];
}

/**
 * Treaty Database Entry
 */
export interface TreatyEntry {
    countryCode: string;
    countryName: string;
    dividendWHT: number;
    interestWHT: number;
    royaltyWHT: number;
    effectiveDate?: string;
    specialProvisions?: string[];
}

// ============================================================================
// TRANSFER PRICING TYPES
// ============================================================================

/**
 * Related Party Transaction
 */
export interface RelatedPartyTransaction {
    transactionId: string;
    transactionType: 'goods' | 'services' | 'financing' | 'intangibles' | 'other';
    counterpartyName: string;
    counterpartyJurisdiction: string;
    relationship: string; // "Parent", "Subsidiary", "Sister company"
    amount: number;
    pricingMethod: 'CUP' | 'RPM' | 'CPM' | 'TNMM' | 'PSM';
    documentationExists: boolean;
}

/**
 * Transfer Pricing Assessment
 */
export interface TransferPricingAssessment {
    transactions: RelatedPartyTransaction[];
    totalRelatedPartyValue: number;
    armLengthCompliance: boolean;
    documentationAdequate: boolean;
    risksIdentified: TPRisk[];
    recommendations: string[];
    masterFileRequired: boolean;
    localFileRequired: boolean;
}

/**
 * Transfer Pricing Risk
 */
export interface TPRisk {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    transactionId?: string;
    message: string;
    remediation?: string;
}

/**
 * Transfer Pricing Documentation
 */
export interface TPDocumentation {
    masterFile?: TPMasterFile;
    localFile?: TPLocalFile;
    generationDate: string;
    fiscalYear: number;
}

/**
 * Master File Structure (OECD BEPS Action 13)
 */
export interface TPMasterFile {
    organizationalStructure: unknown;
    businessDescription: unknown;
    intangibles: unknown;
    intercompanyFinancialActivities: unknown;
    financialAndTaxPositions: unknown;
}

/**
 * Local File Structure
 */
export interface TPLocalFile {
    localEntityDescription: unknown;
    controlledTransactions: unknown;
    financialInformation: unknown;
    comparabilityAnalysis: unknown;
}

// ============================================================================
// VAT REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * VAT Calculation Request
 */
export interface MaltaVATRequest {
    transactionType: VATTransactionType;
    amount: number;
    goodsOrServices: 'goods' | 'services';
    description: string;
    customerLocation: string; // ISO country code
    customerVATNumber?: string;
    customerType: CustomerType;
    transactionDate?: string; // ISO date
}

/**
 * VAT Calculation Result (AI-enhanced)
 */
export interface MaltaVATResult {
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
    rateClassification: 'standard' | 'reduced_12' | 'reduced_7' | 'reduced_5' | 'zero' | 'exempt';
    reverseChargeApplicable: boolean;
    placeOfSupply: string;
    reasoning: string;
    confidenceScore: number;
    applicableArticles: string[];
    cfrGuidanceReferences: string[];
}

/**
 * VAT Return Validation Result
 */
export interface VATReturnValidation {
    valid: boolean;
    errors: VATValidationIssue[];
    warnings: VATValidationIssue[];
    submissionReady: boolean;
}

/**
 * VAT Validation Issue
 */
export interface VATValidationIssue {
    code: string;
    severity: 'error' | 'warning';
    message: string;
    transactionId?: string;
    action?: string;
    penalty?: string;
}

// ============================================================================
// CFR E-SERVICES TYPES
// ============================================================================

/**
 * CFR VAT Return Submission
 */
export interface CFRVATReturnRequest {
    vatNumber: string;
    periodStart: string;
    periodEnd: string;
    box1OutputVAT: number;
    box2InputVAT: number;
    box3NetVAT: number;
    box4TotalSales: number;
    box5TotalPurchases: number;
    intraEUSupplies?: IntraEUSupply[];
    intraEUAcquisitions?: IntraEUAcquisition[];
}

/**
 * Intra-EU Supply for Recapitulative Statement
 */
export interface IntraEUSupply {
    customerVATNumber: string;
    customerCountry: string;
    value: number;
}

/**
 * Intra-EU Acquisition
 */
export interface IntraEUAcquisition {
    supplierVATNumber: string;
    supplierCountry: string;
    value: number;
}

/**
 * CFR Corporate Tax Return Request
 */
export interface CFRCorporateTaxReturn {
    tin: string;
    fiscalYear: number;
    chargeableIncome: number;
    taxAt35Percent: number;
    taxAccountsAllocation: TaxAccountAllocation;
    regime: 'standard' | 'fitwi';
}

/**
 * CFR Shareholder Refund Claim
 */
export interface CFRRefundClaim {
    companyTIN: string;
    shareholderId: string;
    dividendAmount: number;
    distributionDate: string;
    sourceAccount: MaltaTaxAccountType;
    refundClaimed: number;
    beneficialOwners: BeneficialOwner[];
}

/**
 * Beneficial Owner for Refund Claims
 */
export interface BeneficialOwner {
    name: string;
    jurisdiction: string;
    ownershipPercentage: number;
    taxResidency: string;
}

/**
 * CFR API Response
 */
export interface CFRResponse {
    referenceNumber: string;
    status: 'submitted' | 'accepted' | 'rejected' | 'processing';
    submissionDate: string;
    errors?: string[];
    amountPayable?: number;
    paymentDeadline?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Malta Tax Constants
 */
export const MALTA_TAX_CONSTANTS = {
    /** Corporate income tax rate */
    CORPORATE_TAX_RATE: 35,

    /** FITWI regime rate (2025) */
    FITWI_RATE: 15,

    /** FRFTC deemed credit rate */
    FRFTC_RATE: 25,

    /** Refund rates */
    REFUND_RATES: {
        SIX_SEVENTHS: 6 / 7,
        FIVE_SEVENTHS: 5 / 7,
        TWO_THIRDS: 2 / 3,
    },

    /** Effective rates after refund */
    EFFECTIVE_RATES: {
        SIX_SEVENTHS: 5, // 35% × (1 - 6/7) = 5%
        FIVE_SEVENTHS: 10, // 35% × (1 - 5/7) = 10%
    },

    /** Participation exemption thresholds */
    PARTICIPATION_EXEMPTION: {
        MIN_EQUITY_PERCENTAGE: 5,
        MIN_INVESTMENT_EUR: 1164000,
        MIN_HOLDING_DAYS: 183,
        TAX_SAFE_HARBOR_RATE: 15,
    },

    /** Transfer pricing thresholds */
    TRANSFER_PRICING: {
        DOCUMENTATION_THRESHOLD: 500000,
        HIGH_RISK_THRESHOLD: 5000000,
    },

    /** VAT registration thresholds */
    VAT_THRESHOLDS: {
        ARTICLE_10_GOODS: 35000,
        ARTICLE_10_SERVICES: 30000,
        ARTICLE_11_DOMESTIC: 35000,
        ARTICLE_11A_EU_WIDE: 100000,
        INTRASTAT: 700,
    },

    /** Refund claim deadline (days after dividend) */
    REFUND_CLAIM_DAYS: 14,

    /** FITWI binding period (years) */
    FITWI_BINDING_PERIOD: 5,
} as const;

/**
 * EU Country Codes
 */
export const EU_COUNTRY_CODES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const;

export type EUCountryCode = typeof EU_COUNTRY_CODES[number];
