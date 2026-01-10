/**
 * Malta Accounting Agent Types
 * 
 * Core type definitions for entity classification, accounting frameworks,
 * and financial statement requirements per Malta Companies Act 1995.
 */

// ============================================================================
// ENTITY CLASSIFICATION (Companies Act 1995, as amended)
// ============================================================================

/**
 * Malta entity classification based on size thresholds.
 * Classification determines:
 * - Accounting framework (GAPSME vs IFRS)
 * - Audit requirements
 * - Financial statement format
 * - Filing exemptions
 */
export type MaltaEntityClassification =
    | 'MICRO'
    | 'SMALL'
    | 'MEDIUM'
    | 'LARGE'
    | 'PUBLIC_INTEREST';

/**
 * Thresholds for entity classification.
 * Entity exceeds a classification if it exceeds 2 out of 3 thresholds
 * for 2 consecutive years.
 */
export interface EntityThresholds {
    /** Total assets on balance sheet (EUR) */
    totalAssets: number;
    /** Annual turnover/revenue (EUR) */
    turnover: number;
    /** Average number of employees during fiscal year */
    averageEmployees: number;
}

/**
 * 2025 Malta classification thresholds per Companies Act.
 */
export const MALTA_THRESHOLDS_2025: Record<MaltaEntityClassification, EntityThresholds> = {
    MICRO: {
        totalAssets: 350_000,
        turnover: 700_000,
        averageEmployees: 10,
    },
    SMALL: {
        totalAssets: 4_000_000,
        turnover: 8_000_000,
        averageEmployees: 50,
    },
    MEDIUM: {
        totalAssets: 20_000_000,
        turnover: 40_000_000,
        averageEmployees: 250,
    },
    LARGE: {
        totalAssets: Infinity,
        turnover: Infinity,
        averageEmployees: Infinity,
    },
    PUBLIC_INTEREST: {
        totalAssets: Infinity,
        turnover: Infinity,
        averageEmployees: Infinity,
    },
};

// ============================================================================
// ACCOUNTING FRAMEWORK
// ============================================================================

/**
 * Supported accounting frameworks in Malta.
 * - GAPSME: General Accounting Principles for Small and Medium-Sized Entities (LN 289/2015)
 * - IFRS: International Financial Reporting Standards as adopted by EU
 */
export type AccountingFramework = 'GAPSME' | 'IFRS';

/**
 * Framework selection result with audit requirements.
 */
export interface AccountingFrameworkSelection {
    /** Selected framework */
    framework: AccountingFramework;
    /** Whether framework is mandatory (vs optional) */
    mandatory: boolean;
    /** Whether statutory audit is required */
    auditRequired: boolean;
    /** Whether simplified statements allowed */
    simplificationAllowed: boolean;
    /** Reason for selection */
    reason: string;
}

// ============================================================================
// FINANCIAL STATEMENT REQUIREMENTS
// ============================================================================

/**
 * Required financial statements per entity classification.
 */
export interface FinancialStatementRequirements {
    balanceSheet: boolean;
    incomeStatement: boolean;
    cashFlowStatement: boolean;
    equityChangesStatement: boolean;
    notes: boolean;
    directorsReport: boolean;
    auditorsReport: boolean;
}

/**
 * Statement requirements by classification (2025).
 */
export const MALTA_STATEMENT_REQUIREMENTS: Record<MaltaEntityClassification, FinancialStatementRequirements> = {
    MICRO: {
        balanceSheet: true,
        incomeStatement: true,
        cashFlowStatement: false,
        equityChangesStatement: false,
        notes: true,
        directorsReport: false,
        auditorsReport: false,
    },
    SMALL: {
        balanceSheet: true,
        incomeStatement: true,
        cashFlowStatement: false,
        equityChangesStatement: false,
        notes: true,
        directorsReport: true,
        auditorsReport: true,
    },
    MEDIUM: {
        balanceSheet: true,
        incomeStatement: true,
        cashFlowStatement: true,
        equityChangesStatement: true,
        notes: true,
        directorsReport: true,
        auditorsReport: true,
    },
    LARGE: {
        balanceSheet: true,
        incomeStatement: true,
        cashFlowStatement: true,
        equityChangesStatement: true,
        notes: true,
        directorsReport: true,
        auditorsReport: true,
    },
    PUBLIC_INTEREST: {
        balanceSheet: true,
        incomeStatement: true,
        cashFlowStatement: true,
        equityChangesStatement: true,
        notes: true,
        directorsReport: true,
        auditorsReport: true,
    },
};

// ============================================================================
// COMPANY ENTITY
// ============================================================================

/**
 * Malta company entity with accounting configuration.
 */
export interface MaltaCompany {
    id: string;
    /** Malta company registration number (C-XXXXX format) */
    registrationNumber: string;
    name: string;
    tradingName?: string;
    vatNumber?: string;
    /** Tax Identification Number */
    tin?: string;
    incorporationDate: Date;
    /** Fiscal year-end month (1-12) */
    yearEndMonth: number;
    /** Fiscal year-end day (1-31) */
    yearEndDay: number;
    currency: string;
    classification: MaltaEntityClassification;
    accountingFramework: AccountingFramework;
    /** Whether regulated by MFSA, MGA, etc. */
    isRegulated: boolean;
    regulatedBy?: string;
    /** Whether statutory audit is required */
    auditRequired: boolean;
    /** Audit exemption reason if exempt */
    auditExemptionReason?: string;
}

/**
 * Year metrics for classification calculation.
 */
export interface YearMetrics {
    year: number;
    totalAssets: number;
    turnover: number;
    averageEmployees: number;
}
