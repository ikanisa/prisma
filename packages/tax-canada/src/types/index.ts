/**
 * Canada Tax Types
 * 
 * Type definitions for Canadian Corporate Tax (T2) and GST/HST/PST.
 * Supports Federal (CRA) and Provincial (Revenu Quebec, Alberta TRA) filings.
 * 
 * @package @prisma/tax-canada
 */

// ============================================================================
// CORE LOCATION TYPES
// ============================================================================

export type CanadianProvince =
    | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU'
    | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export interface TaxJurisdiction {
    code: 'FED' | CanadianProvince;
    name: string;
    taxType: 'fed' | 'prov';
    authority: 'CRA' | 'RQ' | 'TRA' | 'FIN'; // CRA, Revenu Quebec, Alberta TRA, Finance Dept
}

// ============================================================================
// CORPORATE TAX (T2) TYPES
// ============================================================================

export interface T2Return {
    returnId: string;
    entityId: string;
    taxYearEnd: Date;
    type: 'T2';
    status: 'draft' | 'reviewed' | 'filed' | 'assessed';

    // Core Info
    grossRevenue: number;
    netIncomeForTax: number; // Schedule 1 amount
    taxableIncome: number;
    partIATax: number;

    // Small Business Deduction (SBD)
    sbdLimit: number;
    activeBusinessIncome: number;

    // Manufacturing & Processing
    mpProfits: number;

    // Investment Income
    aggInvestmentIncome: number;
    rdtohmBalance: number; // Refundable Dividend Tax on Hand

    // Credits
    itcClaimed: number; // Investment Tax Credits
    srEdExpenditures: number; // Schedule 32

    schedules: T2Schedule[];
    provincialReturns: ProvincialReturn[];
}

export interface T2Schedule {
    scheduleNumber: string; // e.g., "1", "8", "50"
    name: string;
    data: Record<string, any>;
    calculatedResult: number;
}

export interface ProvincialReturn {
    province: CanadianProvince;
    form: string; // e.g., "CO-17" (QC), "AT1" (AB)
    taxPayable: number;
    credits: number;
}

export interface Gifiform {
    gifiCode: string;
    amount: number;
    description: string;
}

// ============================================================================
// GST/HST TYPES
// ============================================================================

export type TaxRegime =
    | 'GST' // Federal Goods and Services Tax
    | 'HST' // Harmonized Sales Tax
    | 'PST' // Provincial Sales Tax (BC, SK, MB)
    | 'QST'; // Quebec Sales Tax

export interface TaxRate {
    regime: TaxRegime;
    rate: number; // e.g., 0.05
    effectiveDate: Date;
}

export interface GSTReturn {
    returnId: string;
    periodStart: Date;
    periodEnd: Date;
    filingFrequency: 'monthly' | 'quarterly' | 'annual';

    // Line items (GST34 format)
    salesOtherRevenue: number; // Line 101
    gstHstCollected: number;   // Line 105
    gstHstPaid: number;        // Line 108 (ITCs)
    netTax: number;            // Line 109

    // Provincial adjustments
    rebates: number;           // Line 111
    amountOwing: number;

    status: 'draft' | 'filed';
}

// ============================================================================
// SR&ED TYPES (Schedule 32)
// ============================================================================

export interface SREDProject {
    projectId: string;
    title: string;
    fieldOfScience: string;
    description: string;

    // Criteria
    technologicalUncertainty: string;
    technologicalAdvancement: string;
    systematicInvestigation: string;

    // Costs
    salaryWages: number;
    materials: number;
    contracts: number;
    overheads: number; // Proxy method vs Traditional
}

export interface SREDClaim {
    claimId: string;
    taxYear: number;
    projects: SREDProject[];
    totalExpenditures: number;
    qualifiedExpenditures: number;
    itcRate: number; // 15% Fed, varying Prov
    federalITC: number;
    provincialCredit: number;
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface TaxContext {
    entityId: string;
    fiscalYearEnd: Date;
    provinces: CanadianProvince[];
    isCCPC: boolean; // Canadian Controlled Private Corp
    userId: string;
}

export interface TaxAgentResponse<T = unknown> {
    success: boolean;
    data?: T;
    formsGenerated?: string[]; // IDs of generated forms
    warnings?: string[];
    errors?: string[];
    processingTimeMs: number;
}

export type TaxAgentType = 't2_preparation' | 'gst_filing' | 'sred_consultant';

// Re-export CRA EFILE types
export * from './cra-efile.js';
