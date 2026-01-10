/**
 * Malta Accounting Agent Base
 * 
 * Base interface and types for all Malta Accounting autonomous agents.
 */

import type { AccountingFramework, MaltaEntityClassification } from '../types/index.js';

// ============================================================================
// AGENT TYPES
// ============================================================================

/**
 * Agent type classification.
 */
export type AgentType =
    | 'TRANSACTION_PROCESSING'  // Journal entries, bank recon, depreciation
    | 'COMPLIANCE_MONITORING'   // Standards selection, audit exemption
    | 'FINANCIAL_REPORTING'     // Balance sheet, P&L, cash flow, notes
    | 'FILING'                  // MBR, CFR integrations
    | 'ANALYTICS';              // Ratio analysis, fraud detection

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
 * Base interface for all Malta Accounting agents.
 */
export interface MaltaAccountingAgent {
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
    readonly framework: AccountingFramework | 'BOTH';
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
    /** Company entity classification */
    classification: MaltaEntityClassification;
    /** Active accounting framework */
    framework: AccountingFramework;
    /** Fiscal year end date */
    yearEnd: Date;
    /** Current user ID */
    userId?: string;
    /** Firm ID for multi-tenant */
    firmId?: string;
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
}

/**
 * Determine if an action requires human review based on confidence and amount.
 */
export function determineReviewRequirement(
    confidenceScore: number,
    amount: number,
    thresholds: { confidenceMin: number; amountMax: number } = { confidenceMin: 0.90, amountMax: 10000 }
): ReviewGate {
    const lowConfidence = confidenceScore < thresholds.confidenceMin;
    const highAmount = amount > thresholds.amountMax;

    if (lowConfidence && highAmount) {
        return {
            required: true,
            reason: 'Low AI confidence and high transaction amount',
            priority: 'CRITICAL',
            requiredRole: 'MANAGER',
        };
    }

    if (lowConfidence) {
        return {
            required: true,
            reason: `AI confidence ${(confidenceScore * 100).toFixed(1)}% below threshold`,
            priority: 'HIGH',
            requiredRole: 'STAFF',
        };
    }

    if (highAmount) {
        return {
            required: true,
            reason: `Transaction amount €${amount.toLocaleString()} exceeds €${thresholds.amountMax.toLocaleString()} threshold`,
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
