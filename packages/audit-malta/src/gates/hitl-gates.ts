/**
 * Malta Audit HITL Gates
 *
 * Human-in-the-Loop gates for critical audit decisions.
 * Implements quality control per ISQC 1 and firm methodology.
 */

import type {
    HITLGate,
    HITLGateDecision,
    MALTA_HITL_GATES,
} from '../types/index.js';

// ============================================================================
// HITL GATE DEFINITIONS
// ============================================================================

/**
 * Standard HITL gates for Malta audit engagements.
 */
export const MALTA_AUDIT_GATES: HITLGate[] = [
    {
        gateId: 'GATE_001',
        gateName: 'New Client Acceptance',
        triggerCondition: 'New client engagement',
        requiredReviewer: 'PARTNER',
        timeoutHours: 48,
        escalationPath: 'Managing Partner',
    },
    {
        gateId: 'GATE_002',
        gateName: 'Audit Plan Approval',
        triggerCondition: 'All engagements',
        requiredReviewer: 'MANAGER',
        timeoutHours: 72,
        escalationPath: 'Engagement Partner',
    },
    {
        gateId: 'GATE_003',
        gateName: 'Sample Size Override',
        triggerCondition: 'Sample size below 30 or high-risk areas',
        requiredReviewer: 'SENIOR',
        timeoutHours: 24,
        escalationPath: 'Audit Manager',
    },
    {
        gateId: 'GATE_004',
        gateName: 'Materiality Override',
        triggerCondition: 'Materiality exceeds 10% of benchmark',
        requiredReviewer: 'PARTNER',
        timeoutHours: 24,
        escalationPath: 'Quality Partner',
    },
    {
        gateId: 'GATE_005',
        gateName: 'Modified Opinion',
        triggerCondition: 'Qualified/Adverse/Disclaimer opinion or emphasis of matter',
        requiredReviewer: 'PARTNER',
        timeoutHours: 48,
        escalationPath: 'EQCR + Managing Partner',
    },
    {
        gateId: 'GATE_006',
        gateName: 'Going Concern Issue',
        triggerCondition: 'Current ratio < 1.0 or material uncertainty identified',
        requiredReviewer: 'PARTNER',
        timeoutHours: 48,
        escalationPath: 'EQCR + Risk Partner',
    },
    {
        gateId: 'GATE_007',
        gateName: 'Fraud Indicators',
        triggerCondition: 'High fraud risk score or anomalies detected',
        requiredReviewer: 'PARTNER',
        timeoutHours: 24,
        escalationPath: 'Forensic Specialist + Managing Partner',
    },
    {
        gateId: 'GATE_008',
        gateName: 'MFSA Regulated Entity',
        triggerCondition: 'Entity regulated by MFSA',
        requiredReviewer: 'PARTNER',
        timeoutHours: 48,
        escalationPath: 'Financial Services Partner',
    },
    {
        gateId: 'GATE_009',
        gateName: 'Borderline Threshold',
        triggerCondition: 'Article 185(2) thresholds within 5% of limits',
        requiredReviewer: 'MANAGER',
        timeoutHours: 24,
        escalationPath: 'Engagement Partner',
    },
];

// ============================================================================
// HITL GATE MANAGER
// ============================================================================

/**
 * HITL Gate Manager for Malta audit engagements.
 */
export class HITLGateManager {
    private pendingDecisions: Map<string, HITLGateDecision> = new Map();

    /**
     * Trigger a HITL gate.
     */
    async triggerGate(
        gateId: string,
        engagementId: string,
        triggeredBy: string,
        triggerReason: string
    ): Promise<HITLGateDecision> {
        const gate = MALTA_AUDIT_GATES.find((g) => g.gateId === gateId);

        if (!gate) {
            throw new Error(`Unknown gate ID: ${gateId}`);
        }

        const decision: HITLGateDecision = {
            gateId,
            engagementId,
            triggeredAt: new Date(),
            triggeredBy,
            triggerReason,
            decision: 'PENDING',
        };

        // Store pending decision
        const key = `${engagementId}-${gateId}`;
        this.pendingDecisions.set(key, decision);

        // In production, this would:
        // 1. Create database record
        // 2. Send notification to required reviewer
        // 3. Set timeout alarm

        console.log(`[HITL] Gate ${gateId} triggered for engagement ${engagementId}`);
        console.log(`[HITL] Required reviewer: ${gate.requiredReviewer}`);
        console.log(`[HITL] Timeout: ${gate.timeoutHours} hours`);

        return decision;
    }

    /**
     * Record gate decision.
     */
    async recordDecision(
        engagementId: string,
        gateId: string,
        reviewerId: string,
        reviewerRole: string,
        decision: 'APPROVED' | 'REJECTED' | 'ESCALATED',
        rationale: string,
        conditions?: string[]
    ): Promise<HITLGateDecision> {
        const key = `${engagementId}-${gateId}`;
        const pending = this.pendingDecisions.get(key);

        if (!pending) {
            throw new Error(`No pending decision for ${key}`);
        }

        const updated: HITLGateDecision = {
            ...pending,
            reviewerId,
            reviewerRole,
            decision,
            decisionDate: new Date(),
            rationale,
            conditions,
        };

        this.pendingDecisions.set(key, updated);

        // In production, this would:
        // 1. Update database record
        // 2. Add to audit trail
        // 3. Notify engagement team

        console.log(`[HITL] Gate ${gateId} decision recorded: ${decision}`);

        return updated;
    }

    /**
     * Get pending decisions for an engagement.
     */
    getPendingDecisions(engagementId: string): HITLGateDecision[] {
        return Array.from(this.pendingDecisions.values()).filter(
            (d) => d.engagementId === engagementId && d.decision === 'PENDING'
        );
    }

    /**
     * Check if engagement can proceed (all gates approved).
     */
    canProceed(engagementId: string): {
        canProceed: boolean;
        blockedBy: string[];
    } {
        const pending = this.getPendingDecisions(engagementId);

        return {
            canProceed: pending.length === 0,
            blockedBy: pending.map((d) => d.gateId),
        };
    }

    /**
     * Get gate by ID.
     */
    getGate(gateId: string): HITLGate | undefined {
        return MALTA_AUDIT_GATES.find((g) => g.gateId === gateId);
    }

    /**
     * Check if gate timeout has been exceeded.
     */
    isGateTimedOut(decision: HITLGateDecision): boolean {
        const gate = this.getGate(decision.gateId);
        if (!gate) return false;

        const timeoutMs = gate.timeoutHours * 60 * 60 * 1000;
        const elapsed = Date.now() - decision.triggeredAt.getTime();

        return elapsed > timeoutMs;
    }

    /**
     * Get overdue gates that need escalation.
     */
    getOverdueGates(): HITLGateDecision[] {
        return Array.from(this.pendingDecisions.values()).filter(
            (d) => d.decision === 'PENDING' && this.isGateTimedOut(d)
        );
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create HITL Gate Manager instance.
 */
export function createHITLGateManager(): HITLGateManager {
    return new HITLGateManager();
}

/**
 * Lazy singleton instance.
 */
let _hitlGateManager: HITLGateManager | null = null;

export const hitlGateManager = {
    instance(): HITLGateManager {
        if (!_hitlGateManager) {
            _hitlGateManager = new HITLGateManager();
        }
        return _hitlGateManager;
    },
};
