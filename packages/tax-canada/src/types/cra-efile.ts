/**
 * CRA EFILE API Types
 * 
 * Type definitions for Canada Revenue Agency Electronic Filing.
 * Supports T2 Corporate Returns and GST34 Indirect Tax Returns.
 * 
 * Based on CRA XML Schema specifications:
 * - T2: https://www.canada.ca/en/revenue-agency/services/e-services/e-services-businesses/corporation-internet-filing.html
 * - GST/HST: https://www.canada.ca/en/revenue-agency/services/e-services/e-services-businesses/gst-hst-netfile.html
 * 
 * @package @prisma/tax-canada
 */

// ============================================================================
// EFILE SUBMISSION TYPES
// ============================================================================

export type EFILETransmissionType = 'ORIGINAL' | 'AMENDED' | 'RETRANSMIT';

export type EFILEStatus =
    | 'PENDING'
    | 'TRANSMITTED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'PROCESSING'
    | 'ASSESSED';

export interface EFILECredentials {
    efileNumber: string;      // 8-digit EFILE number
    efilePassword: string;    // EFILE password (encrypted)
    repId?: string;           // Representative ID for Represent a Client access
}

export interface EFILESubmission {
    submissionId: string;
    transmissionType: EFILETransmissionType;
    returnType: 'T2' | 'GST34' | 'T1';
    businessNumber: string;   // 9-digit BN
    programAccountNumber: string; // Full 15-char: BN + RC suffix
    fiscalPeriodEnd: Date;
    submittedAt: Date;
    status: EFILEStatus;
    confirmationNumber?: string;
    craResponseCode?: string;
    craResponseMessage?: string;
    xmlPayload?: string;      // Actual XML submitted
}

export interface EFILEResponse {
    success: boolean;
    confirmationNumber?: string;
    responseCode: string;
    responseMessage: string;
    timestamp: Date;
    errors?: EFILEError[];
    warnings?: EFILEWarning[];
}

export interface EFILEError {
    code: string;
    field?: string;
    lineNumber?: number;
    message: string;
    severity: 'ERROR' | 'FATAL';
}

export interface EFILEWarning {
    code: string;
    field?: string;
    message: string;
}

// ============================================================================
// T2 CORPORATE RETURN EFILE TYPES
// ============================================================================

export interface T2EFILEReturn {
    header: T2Header;
    generalInfo: T2GeneralInfo;
    taxCalculation: T2TaxCalculation;
    schedules: T2ScheduleEFILE[];
    gifiData: GIFISection[];
    signatures: T2Signature;
}

export interface T2Header {
    softwareId: string;       // Assigned by CRA
    softwareVersion: string;
    transmitterNumber: string;
    transmissionDateTime: Date;
    languageCode: 'E' | 'F';
}

export interface T2GeneralInfo {
    corporationName: string;
    businessNumber: string;
    corporationAccountNumber: string;
    taxationYearStart: Date;
    taxationYearEnd: Date;
    corporationType: T2CorporationType;
    province: CanadianProvinceCode;
    naicsCode: string;        // 6-digit NAICS
    firstYearFiled: boolean;
    finalReturn: boolean;
}

export type T2CorporationType =
    | 'CCPC'                  // Canadian-Controlled Private Corporation
    | 'NON_CCPC'              // Private non-CCPC
    | 'PUBLIC'                // Public corporation
    | 'CREDIT_UNION'          // Credit union
    | 'CROWN'                 // Crown corporation
    | 'INSURANCE'             // Insurance corporation
    | 'COOPERATIVE';          // Cooperative

export type CanadianProvinceCode =
    | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU'
    | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export interface T2TaxCalculation {
    netIncomePerFinancials: number;     // Line 300
    taxableIncome: number;              // Line 360
    federalTaxPart1: number;            // Line 550
    federalTaxPayable: number;          // Line 700
    provincialTaxPayable: number;       // Line 760
    totalTaxPayable: number;            // Line 770
    refundOrBalance: number;            // Line 894
}

export interface T2ScheduleEFILE {
    scheduleNumber: string;
    scheduleName: string;
    lineItems: T2ScheduleLine[];
}

export interface T2ScheduleLine {
    lineNumber: string;
    description: string;
    amount: number;
}

// Key T2 Schedule Definitions
export type T2ScheduleType =
    | 'SCH1'    // Net Income (Loss) for Income Tax Purposes
    | 'SCH4'    // Corporation Loss Continuity
    | 'SCH5'    // Tax Calculation Supplementary
    | 'SCH7'    // Aggregate Investment Income
    | 'SCH8'    // Capital Cost Allowance (CCA)
    | 'SCH9'    // Related and Associated Corporations
    | 'SCH50'   // Shareholder Information
    | 'SCH100'  // Balance Sheet Information (GIFI)
    | 'SCH125'  // Income Statement Information (GIFI)
    | 'SCH141'  // Notes Checklist
    | 'SCH200'  // T2 Corporation Income Tax Return;

export interface T2Signature {
    certifierName: string;
    certifierPosition: 'DIRECTOR' | 'OFFICER' | 'AUTHORIZED_PERSON';
    authorizationDate: Date;
    phoneNumber: string;
}

// ============================================================================
// GIFI (GENERAL INDEX OF FINANCIAL INFORMATION) TYPES
// ============================================================================

export interface GIFISection {
    sectionCode: GIFISectionCode;
    items: GIFIItem[];
}

export type GIFISectionCode =
    | '1000'    // Assets
    | '2000'    // Liabilities
    | '3000'    // Equity
    | '8000'    // Revenue
    | '9000';   // Expenses

export interface GIFIItem {
    gifiCode: string;         // 4-digit GIFI code
    description: string;
    currentYear: number;
    priorYear?: number;
}

// Common GIFI Codes
export const COMMON_GIFI_CODES = {
    // Assets
    CASH: '1001',
    ACCOUNTS_RECEIVABLE: '1060',
    INVENTORY: '1120',
    PREPAID_EXPENSES: '1180',
    LAND: '1600',
    BUILDINGS: '1680',
    MACHINERY_EQUIPMENT: '1740',
    ACCUMULATED_DEPRECIATION: '1800',

    // Liabilities
    BANK_OVERDRAFT: '2010',
    ACCOUNTS_PAYABLE: '2100',
    INCOME_TAXES_PAYABLE: '2300',
    LONG_TERM_DEBT: '2600',

    // Equity
    SHARE_CAPITAL: '3400',
    RETAINED_EARNINGS: '3600',

    // Revenue
    TRADE_SALES: '8000',
    RENTAL_INCOME: '8140',
    INTEREST_INCOME: '8090',

    // Expenses
    COST_OF_SALES: '8500',
    SALARIES_WAGES: '9060',
    ADVERTISING: '8520',
    DEPRECIATION: '8670',
    INTEREST_EXPENSE: '8710',
} as const;

// ============================================================================
// GST34 EFILE TYPES
// ============================================================================

export interface GST34EFILEReturn {
    header: GST34Header;
    businessInfo: GST34BusinessInfo;
    returnData: GST34ReturnData;
    rebates: GST34Rebates;
}

export interface GST34Header {
    softwareId: string;
    transmissionDateTime: Date;
    languageCode: 'E' | 'F';
}

export interface GST34BusinessInfo {
    businessNumber: string;
    gstAccountNumber: string;   // BN + RT suffix
    businessName: string;
    reportingPeriod: GST34ReportingPeriod;
    periodStart: Date;
    periodEnd: Date;
    filingFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
}

export type GST34ReportingPeriod =
    | 'MONTHLY'
    | 'QUARTERLY_JAN'   // Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
    | 'QUARTERLY_FEB'   // Feb-Apr, May-Jul, Aug-Oct, Nov-Jan
    | 'QUARTERLY_MAR'   // Mar-May, Jun-Aug, Sep-Nov, Dec-Feb
    | 'ANNUAL';

export interface GST34ReturnData {
    line101_salesAndRevenue: number;
    line103_zeroRatedExports: number;
    line104_zeroRatedOther: number;
    line105_gstHstCollected: number;
    line106_adjustments: number;
    line107_gstHstCollectedTotal: number;
    line108_inputTaxCredits: number;
    line109_netTax: number;
    line110_installments: number;
    line111_rebates: number;
    line112_netTaxAfterRebates: number;
    line113a_refundClaimed?: number;
    line113b_balanceOwing?: number;
    line113c_transferToInstallments?: number;
}

export interface GST34Rebates {
    newHousingRebate?: number;
    publicServiceBodiesRebate?: number;
    otherRebates?: number;
    totalRebates: number;
}

// ============================================================================
// EFILE SERVICE INTERFACE
// ============================================================================

export interface CRAEFILEService {
    // Authenticate with CRA
    authenticate(credentials: EFILECredentials): Promise<boolean>;

    // Submit T2 return
    submitT2Return(t2Return: T2EFILEReturn): Promise<EFILEResponse>;

    // Submit GST34 return
    submitGST34Return(gst34Return: GST34EFILEReturn): Promise<EFILEResponse>;

    // Check submission status
    getSubmissionStatus(confirmationNumber: string): Promise<EFILESubmission>;

    // Retrieve Notice of Assessment
    getNoticeOfAssessment(businessNumber: string, taxYear: number): Promise<Buffer>;
}
