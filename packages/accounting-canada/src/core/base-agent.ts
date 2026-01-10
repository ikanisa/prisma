/**
 * Canada Accounting Base Agent
 * 
 * Base agent interface and utilities for Canadian accounting automation.
 * Follows the pattern established in @prisma/accounting-malta.
 * 
 * @package @prisma/accounting-canada
 */

import type {
    AgentType,
    AgentConfig,
    AgentContext,
    AgentResponse,
    AutonomyLevel,
    AccountingFramework,
} from '../types/index.js';

// ============================================================================
// AUTONOMY LEVELS
// ============================================================================

export const AUTONOMY_LEVELS: Record<AutonomyLevel, {
    description: string;
    requiresApproval: boolean;
    materialityThreshold: number;
}> = {
    full: {
        description: 'Agent can execute without human review',
        requiresApproval: false,
        materialityThreshold: Infinity,
    },
    supervised: {
        description: 'Agent executes with periodic oversight',
        requiresApproval: false,
        materialityThreshold: 50000, // CAD
    },
    review_required: {
        description: 'Agent prepares, human approves',
        requiresApproval: true,
        materialityThreshold: 0,
    },
};

// ============================================================================
// REVIEW GATE TYPES
// ============================================================================

export interface ReviewGate {
    gateId: string;
    description: string;
    condition: (context: AgentContext, amount?: number) => boolean;
    escalationLevel: 'manager' | 'partner' | 'client';
}

export const STANDARD_REVIEW_GATES: ReviewGate[] = [
    {
        gateId: 'materiality',
        description: 'Transaction exceeds materiality threshold',
        condition: (_, amount) => (amount || 0) > 50000,
        escalationLevel: 'manager',
    },
    {
        gateId: 'year_end',
        description: 'Year-end close requires review',
        condition: () => true,
        escalationLevel: 'partner',
    },
    {
        gateId: 'framework_change',
        description: 'Accounting framework transition',
        condition: () => true,
        escalationLevel: 'partner',
    },
    {
        gateId: 'quebec_bilingual',
        description: 'Quebec bilingual financial statements',
        condition: (ctx) => ctx.province === 'QC',
        escalationLevel: 'manager',
    },
];

/**
 * Determine if review is required based on context and amount
 */
export function determineReviewRequirement(
    autonomyLevel: AutonomyLevel,
    context: AgentContext,
    amount?: number
): { required: boolean; reason?: string; escalationLevel?: string } {
    const level = AUTONOMY_LEVELS[autonomyLevel];

    if (level.requiresApproval) {
        return { required: true, reason: 'Autonomy level requires approval' };
    }

    if (amount && amount > level.materialityThreshold) {
        return {
            required: true,
            reason: `Amount $${amount.toLocaleString()} exceeds threshold $${level.materialityThreshold.toLocaleString()}`,
            escalationLevel: 'manager',
        };
    }

    for (const gate of STANDARD_REVIEW_GATES) {
        if (gate.condition(context, amount)) {
            return {
                required: true,
                reason: gate.description,
                escalationLevel: gate.escalationLevel,
            };
        }
    }

    return { required: false };
}

// ============================================================================
// BASE AGENT INTERFACE
// ============================================================================

export interface CanadaAccountingAgent {
    readonly slug: string;
    readonly name: string;
    readonly version: string;
    readonly agentType: AgentType;

    /**
     * Get agent capabilities
     */
    getCapabilities(): string[];

    /**
     * Check if agent supports the given framework
     */
    supportsFramework(framework: AccountingFramework): boolean;

    /**
     * Get supported frameworks
     */
    getSupportedFrameworks(): AccountingFramework[];
}

// ============================================================================
// AGENT FACTORY
// ============================================================================

export interface AgentFactory<T extends CanadaAccountingAgent> {
    create(config?: Partial<AgentConfig>): T;
    instance(): T;
}

/**
 * Create a lazy-initialized singleton agent factory
 */
export function createAgentFactory<T extends CanadaAccountingAgent>(
    factory: (config?: Partial<AgentConfig>) => T
): AgentFactory<T> {
    let instance: T | null = null;

    return {
        create: (config?: Partial<AgentConfig>) => factory(config),
        instance: () => {
            if (!instance) {
                instance = factory();
            }
            return instance;
        },
    };
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create a successful agent response
 */
export function createSuccessResponse<T>(
    data: T,
    auditAction: string,
    userId: string,
    processingTimeMs: number = 0
): AgentResponse<T> {
    return {
        success: true,
        data,
        auditTrail: [{
            timestamp: new Date(),
            action: auditAction,
            userId,
        }],
        processingTimeMs,
    };
}

/**
 * Create an error agent response
 */
export function createErrorResponse(
    errors: string[],
    auditAction: string,
    userId: string
): AgentResponse<never> {
    return {
        success: false,
        errors,
        auditTrail: [{
            timestamp: new Date(),
            action: `${auditAction} (failed)`,
            userId,
        }],
        processingTimeMs: 0,
    };
}

// ============================================================================
// FRAMEWORK UTILITIES
// ============================================================================

export const FRAMEWORK_DESCRIPTIONS: Record<AccountingFramework, string> = {
    IFRS: 'International Financial Reporting Standards (CPA Handbook Part I)',
    ASPE: 'Accounting Standards for Private Enterprises (CPA Handbook Part II)',
    ASNFPO: 'Accounting Standards for Not-for-Profit Organizations (CPA Handbook Part III)',
    PSAS: 'Public Sector Accounting Standards (CPA Handbook Part IV)',
};

export const FRAMEWORK_REGULATORY_BODIES: Record<AccountingFramework, string[]> = {
    IFRS: ['CPA Canada', 'IASB', 'OSC (Ontario)', 'AMF (Quebec)'],
    ASPE: ['CPA Canada', 'Accounting Standards Board (AcSB)'],
    ASNFPO: ['CPA Canada', 'Accounting Standards Board (AcSB)'],
    PSAS: ['CPA Canada', 'Public Sector Accounting Board (PSAB)'],
};
