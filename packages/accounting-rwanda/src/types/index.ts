/**
 * Rwanda Accounting Types
 * 
 * Types for Rwanda accounting, audit, and tax operations.
 * Based on ICPAR Law 11/2008, IFRS Standards, and RRA regulations.
 * 
 * @package @prisma/accounting-rwanda
 */

// ============================================================================
// ENTITY CLASSIFICATION
// ============================================================================

/**
 * Rwanda entity types per ICPAR requirements.
 */
export type RwandaEntityType =
    | 'PIE'              // Public Interest Entity (RWF 1B+ turnover)
    | 'LISTED'           // Listed on Rwanda Stock Exchange
    | 'BANK'             // Banks and financial institutions
    | 'INSURANCE'        // Insurance companies
    | 'LARGE_PRIVATE'    // Large private companies
    | 'SME'              // Small and medium enterprises
    | 'SMALL_PRIVATE'    // Small private companies
    | 'PUBLIC_SECTOR';   // Government entities

/**
 * Audit firm tier per ICPAR licensing.
 */
export type AuditTier = 'TIER_I' | 'TIER_II' | 'TIER_III';

/**
 * Rwanda entity classification result.
 */
export interface RwandaEntityClassification {
    entityType: RwandaEntityType;
    requiredFramework: RwandaAccountingFramework;
    requiredAuditTier: AuditTier;
    isPIE: boolean;
    requiresAudit: boolean;
    requiresKAM: boolean;  // Key Audit Matters (ISA 701)
    bnrRegulated: boolean; // BNR oversight for banks
    thresholds: {
        annualTurnover: number;
        totalAssets: number;
        employeeCount: number;
    };
}

// ============================================================================
// ACCOUNTING FRAMEWORK
// ============================================================================

/**
 * Accounting framework options for Rwanda.
 */
export type RwandaAccountingFramework = 'FULL_IFRS' | 'IFRS_FOR_SMES' | 'IPSAS';

/**
 * IFRS standard reference.
 */
export type IFRSStandard =
    | 'IFRS_1'   // First-time Adoption
    | 'IFRS_9'   // Financial Instruments
    | 'IFRS_15'  // Revenue from Contracts
    | 'IFRS_16'  // Leases
    | 'IAS_1'    // Presentation of Financial Statements
    | 'IAS_2'    // Inventories
    | 'IAS_12'   // Income Taxes
    | 'IAS_16'   // Property, Plant and Equipment
    | 'IAS_19'   // Employee Benefits
    | 'IAS_21'   // Foreign Exchange
    | 'IAS_36'   // Impairment
    | 'IAS_37'   // Provisions
    | 'IAS_38';  // Intangible Assets

/**
 * IFRS category for transaction classification.
 */
export interface IFRSCategory {
    standard: IFRSStandard;
    category: string;
    accountCode: string;
    accountName: string;
    recognitionBasis: 'HISTORICAL_COST' | 'FAIR_VALUE' | 'PRESENT_VALUE' | 'AMORTIZED_COST';
    confidence: number;
}

// ============================================================================
// TAX TYPES
// ============================================================================

/**
 * VAT treatment categories.
 */
export type VATCategory = 'STANDARD' | 'ZERO_RATED' | 'EXEMPT' | 'OUT_OF_SCOPE';

/**
 * VAT calculation result.
 */
export interface RwandaVATCalculation {
    netAmount: number;
    vatAmount: number;
    vatRate: number;  // 18% standard, 0% zero-rated
    grossAmount: number;
    category: VATCategory;
    currency: 'RWF';
    ebmInvoiceNumber?: string;
    isEACSupply?: boolean;
    isAfCFTASupply?: boolean;
    originCertificateRequired?: boolean;
}

/**
 * CIT calculation result.
 */
export interface RwandaCITCalculation {
    accountingProfit: number;
    taxableIncome: number;
    citRate: number;  // 28% standard (2024+)
    citPayable: number;
    provisionalPayments: number;
    balancePayable: number;
    effectiveTaxRate: number;
    adjustments: {
        addBacks: TaxAdjustment[];
        deductions: TaxAdjustment[];
    };
}

/**
 * Tax adjustment item.
 */
export interface TaxAdjustment {
    item: string;
    amount: number;
    reference?: string;
}

/**
 * PAYE calculation result.
 */
export interface RwandaPAYECalculation {
    grossSalary: number;
    taxableIncome: number;
    payeTax: number;
    effectiveRate: number;
    bracket: {
        min: number;
        max: number | null;
        rate: number;
    };
}

// ============================================================================
// RSSB (Social Security)
// ============================================================================

/**
 * RSSB contribution rates (2026).
 */
export interface RSSBRates {
    pensionEmployer: number;      // 6%
    pensionEmployee: number;      // 6%
    occupationalHazard: number;   // 2%
    maternityBenefit: number;     // 0.3%
    totalEmployer: number;        // 8.3%
    totalEmployee: number;        // 6%
}

/**
 * RSSB contribution calculation.
 */
export interface RSSBContribution {
    employeeId: string;
    employeeName: string;
    grossSalary: number;
    pensionEmployer: number;
    pensionEmployee: number;
    occupationalHazard: number;
    maternityBenefit: number;
    totalEmployer: number;
    totalEmployee: number;
    netSalary: number;
}

/**
 * RSSB period summary.
 */
export interface RSSBPeriodSummary {
    period: Date;
    employeeCount: number;
    totalGrossSalary: number;
    totalPensionEmployer: number;
    totalPensionEmployee: number;
    totalOccupationalHazard: number;
    totalMaternityBenefit: number;
    grandTotalPayable: number;
    dueDate: Date;
    paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE';
}

// ============================================================================
// AUDIT TYPES (ISA)
// ============================================================================

/**
 * ISA standard reference.
 */
export type ISAStandard =
    | 'ISA_200'  // Overall Objectives
    | 'ISA_240'  // Fraud
    | 'ISA_250'  // Laws and Regulations
    | 'ISA_315'  // Risk Assessment
    | 'ISA_320'  // Materiality
    | 'ISA_330'  // Auditor's Response to Risks
    | 'ISA_500'  // Audit Evidence
    | 'ISA_520'  // Analytical Procedures
    | 'ISA_540'  // Accounting Estimates
    | 'ISA_570'  // Going Concern
    | 'ISA_700'  // Audit Report
    | 'ISA_701'; // Key Audit Matters

/**
 * Risk level classification.
 */
export type RiskLevel = 'LOW' | 'NORMAL' | 'SIGNIFICANT' | 'HIGH';

/**
 * Risk assessment result.
 */
export interface RiskAssessment {
    area: string;
    description: string;
    inherentRisk: RiskLevel;
    controlRisk: RiskLevel;
    detectionRisk: RiskLevel;
    overallRisk: RiskLevel;
    isaReference: ISAStandard;
    rwandaSpecific?: boolean;
    rraComplianceRisk?: boolean;
    bneComplianceRisk?: boolean;
}

/**
 * Materiality calculation result.
 */
export interface MaterialityCalculation {
    overallMateriality: number;
    performanceMateriality: number;
    clearlyTrivial: number;
    base: number;
    baseType: 'TOTAL_ASSETS' | 'PBT' | 'REVENUE' | 'EQUITY';
    percentage: number;
    specificMateriality: {
        relatedPartyTransactions: number;
        directorRemuneration: number;
        taxProvisions: number;
        rssbContributions: number;
    };
}

/**
 * Key Audit Matter (ISA 701).
 */
export interface KeyAuditMatter {
    id: string;
    title: string;
    whyKAM: string;
    howAddressed: string;
    ifrsReference?: string;
    isaReference: ISAStandard;
    auditEffortHours?: number;
    managementJudgmentLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Anomaly detected by audit agent.
 */
export interface AuditAnomaly {
    id: string;
    type: 'POINT' | 'CONTEXTUAL' | 'COLLECTIVE' | 'RWANDA_SPECIFIC';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    transactionId?: string;
    description: string;
    isaReference: ISAStandard;
    rraImplication?: string;
    confidence: number;
    investigated: boolean;
    resolution?: string;
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * Transaction input for processing.
 */
export interface TransactionInput {
    id: string;
    date: Date;
    description: string;
    amount: number;
    currency: 'RWF' | 'USD' | 'EUR' | 'KES';
    type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';
    counterparty?: string;
    counterpartyTIN?: string;
    ebmInvoiceNumber?: string;
    isExport?: boolean;
    isEACSupply?: boolean;
    isAfCFTASupply?: boolean;
    metadata?: Record<string, unknown>;
}

/**
 * Journal entry result.
 */
export interface JournalEntry {
    id: string;
    date: Date;
    description: string;
    entries: JournalLine[];
    ifrsStandard?: IFRSStandard;
    recognitionDate: Date;
    measurementBasis: 'HISTORICAL_COST' | 'FAIR_VALUE' | 'PRESENT_VALUE' | 'AMORTIZED_COST';
    vatAmount?: number;
    vatRate?: number;
    rssbRelated?: boolean;
    aiCategorized: boolean;
    aiConfidence: number;
    requiresReview: boolean;
    reviewReason?: string;
}

/**
 * Journal entry line.
 */
export interface JournalLine {
    accountCode: string;
    accountName: string;
    debit?: number;
    credit?: number;
    description?: string;
}

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

/**
 * Chart of accounts entry.
 */
export interface ChartOfAccountsEntry {
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    parentCode?: string;
    ifrsCategory: string;
    taxTreatment: VATCategory | 'NOT_APPLICABLE';
    currency: 'RWF';
    isActive: boolean;
}

// ============================================================================
// FILING & ISHEMA
// ============================================================================

/**
 * VAT return for ISHEMA submission.
 */
export interface VATReturn {
    period: {
        start: Date;
        end: Date;
        type: 'MONTHLY' | 'QUARTERLY';
    };
    box1StandardRatedSupplies: number;
    box1OutputVAT: number;
    box2ZeroRatedSupplies: number;
    box3ExemptSupplies: number;
    box4TotalSupplies: number;
    box5InputVAT: number;
    box6NetVAT: number;
    box7Amount: number;
    box7Type: 'PAYABLE' | 'REFUNDABLE';
    ebmInvoiceCount: number;
    ishemaReference?: string;
    submittedAt?: Date;
    status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
}

/**
 * CIT return for ISHEMA submission.
 */
export interface CITReturn {
    financialYearEnd: Date;
    accountingProfit: number;
    taxAdjustmentsAddBacks: number;
    taxAdjustmentsDeductions: number;
    taxableIncome: number;
    citRate: number;
    citPayable: number;
    provisionalPayments: number;
    balancePayable: number;
    ishemaReference?: string;
    submittedAt?: Date;
    status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
}

/**
 * ISHEMA API response.
 */
export interface ISHEMAResponse {
    success: boolean;
    referenceNumber?: string;
    submissionDate?: Date;
    dueDate?: Date;
    amount?: number;
    status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'ERROR';
    errorMessage?: string;
    requiresManualIntervention?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Rwanda tax rates (2026).
 */
export const RWANDA_TAX_RATES_2026 = {
    VAT_STANDARD: 18,
    CIT_STANDARD: 28,          // Reduced from 30% in 2024
    CIT_LISTED_40PCT: 20,      // Listed with 40%+ public shareholding
    CIT_LISTED_30PCT: 25,      // Listed with 30%+ public shareholding
    CIT_HOLDING_IP: 3,         // Holding companies, IP companies
    WITHHOLDING_SERVICES: 15,
    WITHHOLDING_DIVIDENDS: 15,
    WITHHOLDING_RENT: 15,
    DIGITAL_SERVICES_TAX: 1.5,
    TOURISM_LEVY: 3,
} as const;

/**
 * RSSB rates (2026).
 */
export const RSSB_RATES_2026: RSSBRates = {
    pensionEmployer: 6,
    pensionEmployee: 6,
    occupationalHazard: 2,
    maternityBenefit: 0.3,
    totalEmployer: 8.3,
    totalEmployee: 6,
};

/**
 * PAYE brackets (2026).
 */
export const PAYE_BRACKETS_2026 = [
    { min: 0, max: 30000, rate: 0, annualMin: 0, annualMax: 360000 },
    { min: 30001, max: 100000, rate: 20, annualMin: 360001, annualMax: 1200000 },
    { min: 100001, max: null, rate: 30, annualMin: 1200001, annualMax: null },
] as const;

/**
 * VAT registration thresholds.
 */
export const VAT_THRESHOLDS = {
    ANNUAL: 20_000_000,    // RWF 20M annual
    QUARTERLY: 5_000_000,  // RWF 5M quarterly
    REGISTRATION_DAYS: 7,  // Days to register after exceeding
} as const;

/**
 * PIE thresholds.
 */
export const PIE_THRESHOLDS = {
    ANNUAL_TURNOVER: 1_000_000_000,  // RWF 1B
} as const;
