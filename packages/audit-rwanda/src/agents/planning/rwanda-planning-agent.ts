/**
 * Rwanda Audit Planning Agent
 * 
 * ISA 300/315/320 compliant audit planning with Rwanda-specific considerations.
 * 
 * Features:
 * - Engagement planning per ISA 300
 * - Risk assessment procedures per ISA 315
 * - Materiality determination per ISA 320
 * - ICPAR quality requirements
 * 
 * @package @prisma/audit-rwanda
 */

import type {
    RwandaAuditAgent,
    AgentConfig,
    AuditContext,
    MaterialityCalculation,
    RiskLevel,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface EngagementPlan {
    engagementId: string;
    entityName: string;
    fiscalYearEnd: Date;
    planningDate: Date;
    reportingFramework: 'IFRS' | 'IFRS_SME';
    auditStrategy: AuditStrategy;
    materiality: MaterialityCalculation;
    timeline: AuditTimeline;
    teamComposition: TeamMember[];
    significantAreas: string[];
    riskAreas: string[];
    clientAcceptance: ClientAcceptanceCheck;
}

export interface AuditStrategy {
    approach: 'substantive' | 'combined' | 'controls_reliance';
    rationale: string;
    keyFocusAreas: string[];
    specialistInvolvement: string[];
    groupAuditConsiderations?: string;
}

export interface AuditTimeline {
    planningPhase: { start: Date; end: Date };
    interimPhase?: { start: Date; end: Date };
    yearEndPhase: { start: Date; end: Date };
    completionPhase: { start: Date; end: Date };
    reportingDeadline: Date;
}

export interface TeamMember {
    role: 'partner' | 'manager' | 'senior' | 'staff';
    name: string;
    icparNumber?: string;
    responsibilities: string[];
    hoursAllocated: number;
}

export interface ClientAcceptanceCheck {
    integrityVerified: boolean;
    independenceConfirmed: boolean;
    competenceAssessed: boolean;
    resourcesAvailable: boolean;
    preconditionsAccepted: boolean;
    feeAgreed: boolean;
    overallConclusion: 'accept' | 'decline' | 'pending';
    issues?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MATERIALITY_BENCHMARKS = {
    PIE: {
        pbt: { min: 3, max: 5 },
        totalAssets: { min: 0.5, max: 1 },
        revenue: { min: 0.5, max: 1 },
    },
    NON_PIE: {
        pbt: { min: 5, max: 10 },
        totalAssets: { min: 1, max: 2 },
        revenue: { min: 0.5, max: 1 },
    },
};

const PERFORMANCE_MATERIALITY_FACTOR = 0.75;
const TRIVIAL_THRESHOLD_FACTOR = 0.03;

// ============================================================================
// RWANDA PLANNING AGENT
// ============================================================================

export class RwandaPlanningAgent implements RwandaAuditAgent {
    public readonly name = 'Rwanda Audit Planning Agent';
    public readonly version = '1.0.0';
    public readonly category = 'audit' as const;
    public readonly jurisdiction = 'RW' as const;

    constructor(_config: AgentConfig = {}) { }

    getCapabilities(): string[] {
        return [
            'ISA 300 engagement planning',
            'ISA 315 risk assessment procedures',
            'ISA 320 materiality determination',
            'Client acceptance evaluation',
            'Audit strategy formulation',
            'Team composition planning',
            'Timeline development',
            'ICPAR quality compliance',
        ];
    }

    /**
     * Create comprehensive engagement planning for Rwanda audit.
     */
    createEngagementPlan(input: {
        context: AuditContext;
        financials: {
            totalAssets: number;
            totalRevenue: number;
            profitBeforeTax: number;
            equity: number;
        };
        priorYearMateriality?: number;
        specialConsiderations?: string[];
    }): EngagementPlan {
        const { context, financials } = input;

        // Determine audit strategy
        const strategy = this.determineAuditStrategy(context);

        // Calculate materiality
        const materiality = this.calculateMateriality({
            ...financials,
            isPIE: context.isPublicInterestEntity,
            isLossmaking: financials.profitBeforeTax <= 0,
        });

        // Create timeline
        const timeline = this.createTimeline(context.fiscalYearEnd);

        // Default team composition
        const team = this.createDefaultTeam(context.isPublicInterestEntity);

        // Client acceptance
        const acceptance: ClientAcceptanceCheck = {
            integrityVerified: true,
            independenceConfirmed: true,
            competenceAssessed: true,
            resourcesAvailable: true,
            preconditionsAccepted: true,
            feeAgreed: true,
            overallConclusion: 'accept',
        };

        // Significant areas
        const significantAreas = this.identifySignificantAreas(financials);

        // Risk areas
        const riskAreas = this.identifyRiskAreas(context);

        return {
            engagementId: this.generateEngagementId(context.entityId),
            entityName: context.entityName,
            fiscalYearEnd: context.fiscalYearEnd,
            planningDate: new Date(),
            reportingFramework: context.reportingFramework,
            auditStrategy: strategy,
            materiality,
            timeline,
            teamComposition: team,
            significantAreas,
            riskAreas,
            clientAcceptance: acceptance,
        };
    }

    /**
     * Determine appropriate audit strategy.
     */
    private determineAuditStrategy(context: AuditContext): AuditStrategy {
        const specialists: string[] = [];
        const focusAreas: string[] = ['Revenue recognition', 'Management override of controls'];

        if (context.isPublicInterestEntity) {
            focusAreas.push('Going concern assessment', 'Key Audit Matters identification');
        }

        // Industry-specific considerations
        if (context.icparRegistrationNumber) {
            focusAreas.push('ICPAR quality standards compliance');
        }

        return {
            approach: context.isPublicInterestEntity ? 'combined' : 'substantive',
            rationale: context.isPublicInterestEntity
                ? 'Combined approach due to PIE status and enhanced control testing requirements'
                : 'Primarily substantive approach due to entity size and nature',
            keyFocusAreas: focusAreas,
            specialistInvolvement: specialists,
        };
    }

    /**
     * Calculate materiality levels.
     */
    calculateMateriality(input: {
        totalAssets: number;
        totalRevenue: number;
        profitBeforeTax: number;
        equity: number;
        isPIE: boolean;
        isLossmaking: boolean;
    }): MaterialityCalculation {
        const benchmarks = input.isPIE ? MATERIALITY_BENCHMARKS.PIE : MATERIALITY_BENCHMARKS.NON_PIE;

        let benchmarkValue: number;
        let benchmarkUsed: string;
        let percentageApplied: number;

        if (input.isLossmaking || input.profitBeforeTax <= 0) {
            benchmarkValue = input.totalAssets;
            benchmarkUsed = 'Total Assets';
            percentageApplied = (benchmarks.totalAssets.min + benchmarks.totalAssets.max) / 2;
        } else {
            benchmarkValue = input.profitBeforeTax;
            benchmarkUsed = 'Profit Before Tax';
            percentageApplied = (benchmarks.pbt.min + benchmarks.pbt.max) / 2;
        }

        const overallMateriality = Math.round(benchmarkValue * (percentageApplied / 100));
        const performanceMateriality = Math.round(overallMateriality * PERFORMANCE_MATERIALITY_FACTOR);
        const trivialThreshold = Math.round(overallMateriality * TRIVIAL_THRESHOLD_FACTOR);

        return {
            overallMateriality,
            performanceMateriality,
            trivialThreshold,
            benchmarkUsed,
            benchmarkValue,
            percentageApplied,
            justification: `${benchmarkUsed} selected as most appropriate benchmark. ${percentageApplied}% applied based on ${input.isPIE ? 'PIE' : 'non-PIE'} status and professional judgment.`,
        };
    }

    /**
     * Create audit timeline based on fiscal year end.
     */
    private createTimeline(fiscalYearEnd: Date): AuditTimeline {
        const fyEnd = new Date(fiscalYearEnd);

        // Planning: 2-3 months before year end
        const planningStart = new Date(fyEnd);
        planningStart.setMonth(planningStart.getMonth() - 3);
        const planningEnd = new Date(fyEnd);
        planningEnd.setMonth(planningEnd.getMonth() - 2);

        // Interim: 1-2 months before year end (optional)
        const interimStart = new Date(fyEnd);
        interimStart.setMonth(interimStart.getMonth() - 2);
        const interimEnd = new Date(fyEnd);
        interimEnd.setMonth(interimEnd.getMonth() - 1);

        // Year-end: 2-6 weeks after year end
        const yearEndStart = new Date(fyEnd);
        yearEndStart.setDate(yearEndStart.getDate() + 14);
        const yearEndEnd = new Date(fyEnd);
        yearEndEnd.setDate(yearEndEnd.getDate() + 42);

        // Completion: 6-10 weeks after year end
        const completionStart = new Date(fyEnd);
        completionStart.setDate(completionStart.getDate() + 42);
        const completionEnd = new Date(fyEnd);
        completionEnd.setDate(completionEnd.getDate() + 70);

        // Reporting deadline: typically 3 months after year end for Rwanda
        const reportingDeadline = new Date(fyEnd);
        reportingDeadline.setMonth(reportingDeadline.getMonth() + 3);

        return {
            planningPhase: { start: planningStart, end: planningEnd },
            interimPhase: { start: interimStart, end: interimEnd },
            yearEndPhase: { start: yearEndStart, end: yearEndEnd },
            completionPhase: { start: completionStart, end: completionEnd },
            reportingDeadline,
        };
    }

    /**
     * Create default audit team.
     */
    private createDefaultTeam(isPIE: boolean): TeamMember[] {
        const team: TeamMember[] = [
            {
                role: 'partner',
                name: 'TBD - Engagement Partner',
                responsibilities: ['Overall engagement responsibility', 'Opinion signing', 'Quality review'],
                hoursAllocated: isPIE ? 40 : 20,
            },
            {
                role: 'manager',
                name: 'TBD - Audit Manager',
                responsibilities: ['Day-to-day management', 'Review of working papers', 'Client liaison'],
                hoursAllocated: isPIE ? 80 : 40,
            },
            {
                role: 'senior',
                name: 'TBD - Senior Auditor',
                responsibilities: ['Fieldwork supervision', 'Complex testing', 'Draft reporting'],
                hoursAllocated: isPIE ? 160 : 80,
            },
            {
                role: 'staff',
                name: 'TBD - Audit Staff',
                responsibilities: ['Routine testing', 'Documentation', 'Support'],
                hoursAllocated: isPIE ? 200 : 100,
            },
        ];

        if (isPIE) {
            team.unshift({
                role: 'partner',
                name: 'TBD - EQCR Partner',
                responsibilities: ['Engagement Quality Control Review'],
                hoursAllocated: 16,
            });
        }

        return team;
    }

    /**
     * Identify significant financial statement areas.
     */
    private identifySignificantAreas(financials: {
        totalAssets: number;
        totalRevenue: number;
        profitBeforeTax: number;
    }): string[] {
        const areas: string[] = ['Revenue', 'Trade Receivables', 'Cash and Bank'];

        if (financials.totalAssets > 1_000_000_000) {
            areas.push('Property, Plant and Equipment', 'Investments');
        }

        areas.push('Trade Payables', 'Tax Liabilities', 'Provisions');

        return areas;
    }

    /**
     * Identify risk areas based on context.
     */
    private identifyRiskAreas(context: AuditContext): string[] {
        const risks: string[] = [
            'Revenue recognition (ISA 240 presumed)',
            'Management override of controls (ISA 240 presumed)',
            'RRA tax compliance',
            'RSSB contribution accuracy',
        ];

        if (context.isPublicInterestEntity) {
            risks.push('Going concern assessment');
            risks.push('Related party transactions');
        }

        return risks;
    }

    private generateEngagementId(entityId: string): string {
        const year = new Date().getFullYear();
        return `RW-AUD-${entityId.substring(0, 6).toUpperCase()}-${year}`;
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaPlanningAgent(config?: AgentConfig): RwandaPlanningAgent {
    return new RwandaPlanningAgent(config);
}

let _planningAgent: RwandaPlanningAgent | null = null;

export const rwandaPlanningAgent = {
    instance(config?: AgentConfig): RwandaPlanningAgent {
        if (!_planningAgent) {
            _planningAgent = new RwandaPlanningAgent(config);
        }
        return _planningAgent;
    },
};
