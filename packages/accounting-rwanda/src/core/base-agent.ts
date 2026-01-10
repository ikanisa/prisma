/**
 * Rwanda Accounting Agent Base
 * 
 * Base interface and types for all Rwanda Accounting autonomous agents.
 * Follows ISA and IFRS standards per ICPAR Law 11/2008.
 * 
 * @package @prisma/accounting-rwanda
 */

import type { RwandaAccountingFramework, RwandaEntityClassification } from '../types/index.js';

// ============================================================================
// AGENT TYPES
// ============================================================================

/**
 * Agent type classification.
 */
export type AgentType =
    | 'TRANSACTION_PROCESSING'  // Journal entries, bank recon, depreciation
    | 'COMPLIANCE_MONITORING'   // VAT, RSSB, IFRS compliance
    | 'FINANCIAL_REPORTING'     // Balance sheet, P&L, cash flow
    | 'FILING'                  // RRA ISHEMA, RSSB submissions
    | 'AUDIT'                   // ISA-based audit procedures
    | 'ANALYTICS';              // Ratio analysis, anomaly detection

/**
 * Agent autonomy levels (0-5).
 * Higher levels = more autonomous operation.
 */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Autonomy level descriptions.
 */
export const AUTONOMY_LEVELS: Record<AutonomyLevel, string> = {
    0: 'No autonomy - requires human for all decisions',
    1: 'Minimal - suggests actions, human executes',
    2: 'Low - executes simple actions, human reviews all',
    3: 'Moderate - executes routine actions, human reviews exceptions',
    4: 'High - executes most actions, human reviews unusual only',
    5: 'Full - fully autonomous for deterministic operations',
};

// ============================================================================
// BASE AGENT INTERFACE
// ============================================================================

/**
 * Base interface for all Rwanda Accounting agents.
 */
export interface RwandaAccountingAgent {
    /** Unique agent identifier */
    readonly agentId: string;
    /** Human-readable agent name */
    readonly name: string;
    /** Agent version */
    readonly version: string;
    /** Agent type classification */
    readonly agentType: AgentType;
    /** Agent capabilities */
    readonly capabilities: string[];
    /** Supported accounting frameworks */
    readonly framework: RwandaAccountingFramework | 'ALL';
    /** Autonomy level (0-5) */
    readonly autonomyLevel: AutonomyLevel;
    /** Supported currencies */
    readonly supportedCurrencies: string[];
}

// ============================================================================
// AGENT CONTEXT
// ============================================================================

/**
 * Context passed to agents for execution.
 */
export interface AgentContext {
    /** Company ID */
    companyId: string;
    /** Company name */
    companyName: string;
    /** Company TIN */
    tin: string;
    /** Company entity classification */
    classification: RwandaEntityClassification;
    /** Active accounting framework */
    framework: RwandaAccountingFramework;
    /** Audit tier */
    auditTier?: 'TIER_I' | 'TIER_II' | 'TIER_III';
    /** Fiscal year end date */
    fiscalYearEnd: Date;
    /** Reporting currency */
    reportingCurrency: string;
    /** Current user ID */
    userId?: string;
    /** Firm ID for multi-tenant */
    firmId?: string;
    /** Is VAT registered */
    isVATRegistered: boolean;
    /** EBM serial number */
    ebmSerialNumber?: string;
    /** Current date for processing */
    currentDate?: Date;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT RESPONSE
// ============================================================================

/**
 * Standard agent response structure.
 */
export interface AgentResponse<T = unknown> {
    /** Whether operation succeeded */
    success: boolean;
    /** Response data */
    data?: T;
    /** Error message if failed */
    error?: string;
    /** Error code */
    errorCode?: string;
    /** Warnings */
    warnings?: string[];
    /** AI confidence score (0-1) */
    confidenceScore?: number;
    /** Whether human review is required */
    requiresReview: boolean;
    /** Review reason if required */
    reviewReason?: string;
    /** IFRS standard applied */
    ifrsStandard?: string;
    /** ISA standard applied */
    isaStandard?: string;
    /** RRA compliance status */
    rraCompliant?: boolean;
    /** Trace ID for debugging */
    traceId?: string;
    /** Execution duration in ms */
    durationMs?: number;
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

/**
 * Base agent configuration.
 */
export interface AgentConfig {
    /** OpenAI API key */
    openaiApiKey?: string;
    /** Model to use (default: gpt-4o) */
    model?: string;
    /** Enable AI features */
    enableAI?: boolean;
    /** Organization ID */
    organizationId?: string;
    /** User ID */
    userId?: string;
    /** RRA API endpoint */
    rraApiEndpoint?: string;
    /** RSSB API endpoint */
    rssbApiEndpoint?: string;
}

// ============================================================================
// REVIEW GATE
// ============================================================================

/**
 * Review gate for human-in-the-loop.
 */
export interface ReviewGate {
    /** Whether review is required */
    required: boolean;
    /** Reason for review */
    reason: string;
    /** Review priority */
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    /** Reviewer role required */
    requiredRole?: 'STAFF' | 'MANAGER' | 'PARTNER';
    /** Review deadline */
    deadline?: Date;
    /** ISA reference if applicable */
    isaReference?: string;
}

/**
 * Determine if an action requires human review based on confidence and amount.
 * Rwanda-specific thresholds (amounts in RWF).
 */
export function determineReviewRequirement(
    confidenceScore: number,
    amount: number,
    thresholds: { confidenceMin: number; amountMax: number } = {
        confidenceMin: 0.90,
        amountMax: 10_000_000  // RWF 10M
    }
): ReviewGate {
    const lowConfidence = confidenceScore < thresholds.confidenceMin;
    const highAmount = amount > thresholds.amountMax;

    if (lowConfidence && highAmount) {
        return {
            required: true,
            reason: 'Low AI confidence and high transaction amount',
            priority: 'CRITICAL',
            requiredRole: 'PARTNER',
            isaReference: 'ISA 315',
        };
    }

    if (lowConfidence) {
        return {
            required: true,
            reason: `AI confidence ${(confidenceScore * 100).toFixed(1)}% below threshold`,
            priority: 'HIGH',
            requiredRole: 'MANAGER',
        };
    }

    if (highAmount) {
        return {
            required: true,
            reason: `Transaction amount RWF ${amount.toLocaleString()} exceeds RWF ${thresholds.amountMax.toLocaleString()} threshold`,
            priority: 'MEDIUM',
            requiredRole: 'MANAGER',
        };
    }

    return {
        required: false,
        reason: 'Within automated processing thresholds',
        priority: 'LOW',
    };
}

/**
 * Determine review requirement for tax submissions.
 */
export function determineTaxReviewRequirement(
    taxType: 'VAT' | 'CIT' | 'PAYE' | 'RSSB',
    amount: number,
    isFirstSubmission: boolean = false
): ReviewGate {
    // First submissions always require partner review
    if (isFirstSubmission) {
        return {
            required: true,
            reason: `First ${taxType} submission for this entity`,
            priority: 'CRITICAL',
            requiredRole: 'PARTNER',
        };
    }

    // CIT always requires manager review
    if (taxType === 'CIT') {
        return {
            required: true,
            reason: 'Annual CIT return requires manager review',
            priority: 'HIGH',
            requiredRole: 'MANAGER',
        };
    }

    // High value thresholds (RWF)
    const thresholds: Record<string, number> = {
        VAT: 50_000_000,   // RWF 50M
        PAYE: 20_000_000,  // RWF 20M
        RSSB: 20_000_000,  // RWF 20M
    };

    if (amount > (thresholds[taxType] || 0)) {
        return {
            required: true,
            reason: `${taxType} amount exceeds review threshold`,
            priority: 'MEDIUM',
            requiredRole: 'MANAGER',
        };
    }

    return {
        required: false,
        reason: 'Within automated processing thresholds',
        priority: 'LOW',
    };
}
