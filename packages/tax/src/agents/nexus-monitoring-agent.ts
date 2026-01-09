/**
 * Nexus Monitoring Agent
 * 
 * AI-powered agent for multi-state/jurisdiction tax nexus monitoring.
 * Tracks business activities, evaluates nexus thresholds, generates
 * alerts, and produces comprehensive nexus study reports.
 * 
 * @example
 * ```typescript
 * const agent = new NexusMonitoringAgent(config);
 * 
 * // Generate nexus study
 * const study = await agent.generateNexusStudy({
 *     entityId: 'entity-123',
 *     activities: activityEvents,
 * });
 * 
 * // Get alerts
 * const alerts = agent.getActiveAlerts('entity-123');
 * ```
 */

import { BaseAgent, type AgentConfig, type AgentContext, type AgentResult } from '../../agents/base-agent.js';
import { NexusRulesEngine, nexusRulesEngine } from './nexus-rules-engine.js';
import type {
    JurisdictionCode,
    NexusStudy,
    NexusActivityEvent,
    JurisdictionNexusExposure,
    NexusAlert,
    NexusRecommendation,
    PeriodActivity,
} from '../types/nexus.js';

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface NexusMonitoringConfig extends AgentConfig {
    alertThresholdPercent?: number;  // Default: 75
    autoRegisterThreshold?: number;  // Auto-suggest registration at this %
    studyPeriodMonths?: number;      // Default: 12
    includeIncomeTax?: boolean;      // Default: true
}

export interface NexusStudyRequest {
    entityId: string;
    entityName?: string;
    activities: NexusActivityEvent[];
    registrations?: { jurisdictionCode: JurisdictionCode; registrationDate: Date; registrationNumber?: string }[];
    studyPeriodStart?: Date;
    studyPeriodEnd?: Date;
}

// ============================================================================
// NEXUS MONITORING AGENT
// ============================================================================

export class NexusMonitoringAgent {
    private config: NexusMonitoringConfig;
    private rulesEngine: NexusRulesEngine;
    private alertCache: Map<string, NexusAlert[]> = new Map();

    constructor(config: NexusMonitoringConfig = {}) {
        this.config = {
            name: 'nexus-monitoring-agent',
            description: 'Multi-state/jurisdiction tax nexus monitoring',
            alertThresholdPercent: 75,
            autoRegisterThreshold: 100,
            studyPeriodMonths: 12,
            includeIncomeTax: true,
            ...config,
        };
        this.rulesEngine = nexusRulesEngine;
    }

    /**
     * Generate comprehensive nexus study
     */
    async generateNexusStudy(request: NexusStudyRequest): Promise<NexusStudy> {
        const now = new Date();
        const studyPeriodEnd = request.studyPeriodEnd ?? now;
        const studyPeriodStart = request.studyPeriodStart ??
            new Date(studyPeriodEnd.getFullYear() - 1, studyPeriodEnd.getMonth(), studyPeriodEnd.getDate());

        // Aggregate activities by jurisdiction
        const activityByJurisdiction = this.aggregateActivities(
            request.activities,
            studyPeriodStart,
            studyPeriodEnd
        );

        // Evaluate nexus for each jurisdiction
        const exposures = this.rulesEngine.evaluateAllJurisdictions(activityByJurisdiction);

        // Enrich with registration status
        if (request.registrations) {
            for (const exposure of exposures) {
                const reg = request.registrations.find(r => r.jurisdictionCode === exposure.jurisdictionCode);
                if (reg) {
                    exposure.isRegistered = true;
                    exposure.registrationDate = reg.registrationDate;
                    exposure.registrationNumber = reg.registrationNumber;
                }
            }
        }

        // Calculate compliance status
        this.calculateComplianceStatus(exposures);

        // Generate recommendations
        const recommendations = this.generateRecommendations(exposures);

        // Generate alerts
        const alerts = this.rulesEngine.generateAlerts(request.entityId, exposures);
        this.alertCache.set(request.entityId, alerts);

        // Build summary
        const summary = this.buildSummary(exposures);

        const study: NexusStudy = {
            id: crypto.randomUUID(),
            entityId: request.entityId,
            entityName: request.entityName ?? request.entityId,
            studyPeriodStart,
            studyPeriodEnd,
            asOfDate: now,
            exposures,
            summary,
            recommendations,
            preparedBy: 'Nexus Monitoring Agent',
            preparedAt: now,
            status: 'draft',
        };

        return study;
    }

    /**
     * Process real-time activity event
     */
    async processActivityEvent(event: NexusActivityEvent): Promise<{
        processed: boolean;
        alerts?: NexusAlert[];
        nexusImpact?: string;
    }> {
        // In a real implementation, this would:
        // 1. Store the event in database
        // 2. Update running totals
        // 3. Check if thresholds are breached
        // 4. Generate alerts if needed

        const exposure = this.rulesEngine.evaluateNexus(
            event.jurisdictionCode,
            this.eventToPeriodActivity(event),
            { grossSales: event.amount ?? 0, transactionCount: 1, employeeDays: 0, propertyValue: 0 }
        );

        const alerts = this.rulesEngine.generateAlerts(event.entityId, [exposure]);

        let nexusImpact: string | undefined;
        if (exposure.salesTaxNexus.status === 'established') {
            nexusImpact = `Sales tax nexus established in ${exposure.jurisdictionName}`;
        } else if (exposure.salesTaxNexus.status === 'approaching') {
            nexusImpact = `Approaching sales tax threshold in ${exposure.jurisdictionName} (${Math.round(exposure.salesTaxNexus.salesThresholdPercent)}%)`;
        }

        return {
            processed: true,
            alerts: alerts.length > 0 ? alerts : undefined,
            nexusImpact,
        };
    }

    /**
     * Get active alerts for an entity
     */
    getActiveAlerts(entityId: string): NexusAlert[] {
        return this.alertCache.get(entityId) ?? [];
    }

    /**
     * Get filing requirements for established nexus jurisdictions
     */
    getFilingRequirements(exposures: JurisdictionNexusExposure[]): Array<{
        jurisdictionCode: JurisdictionCode;
        jurisdictionName: string;
        taxType: 'sales' | 'income';
        frequency: string;
        nextDueDate: Date;
        estimatedAmount?: number;
    }> {
        const requirements: Array<{
            jurisdictionCode: JurisdictionCode;
            jurisdictionName: string;
            taxType: 'sales' | 'income';
            frequency: string;
            nextDueDate: Date;
            estimatedAmount?: number;
        }> = [];

        for (const exposure of exposures) {
            if (exposure.salesTaxNexus.status === 'established' && exposure.isRegistered) {
                const rules = this.rulesEngine.getRules(exposure.jurisdictionCode);
                requirements.push({
                    jurisdictionCode: exposure.jurisdictionCode,
                    jurisdictionName: exposure.jurisdictionName,
                    taxType: 'sales',
                    frequency: rules?.filingFrequency ?? 'quarterly',
                    nextDueDate: this.calculateNextFilingDate(rules?.filingFrequency ?? 'quarterly'),
                    estimatedAmount: exposure.estimatedTaxLiability,
                });
            }

            if (exposure.incomeTaxNexus.status === 'established' && this.config.includeIncomeTax) {
                requirements.push({
                    jurisdictionCode: exposure.jurisdictionCode,
                    jurisdictionName: exposure.jurisdictionName,
                    taxType: 'income',
                    frequency: 'annual',
                    nextDueDate: this.calculateNextFilingDate('annual'),
                });
            }
        }

        return requirements.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());
    }

    /**
     * Estimate total exposure across jurisdictions
     */
    estimateTotalExposure(exposures: JurisdictionNexusExposure[]): {
        registeredJurisdictions: number;
        unregisteredWithNexus: number;
        estimatedBackTaxes: number;
        estimatedPenalties: number;
        estimatedOngoingAnnual: number;
    } {
        let unregisteredWithNexus = 0;
        let estimatedBackTaxes = 0;
        let estimatedPenalties = 0;
        let estimatedOngoingAnnual = 0;

        for (const exposure of exposures) {
            if (exposure.salesTaxNexus.status === 'established') {
                if (exposure.isRegistered) {
                    // Estimate ongoing liability (simplified: 5% of taxable sales)
                    estimatedOngoingAnnual += exposure.currentPeriod.taxableSales * 0.05;
                } else {
                    unregisteredWithNexus++;
                    // Estimate back taxes (3 years of activity)
                    const estimatedBackSales = exposure.trailingMetrics.grossSales * 3;
                    estimatedBackTaxes += estimatedBackSales * 0.05;
                    // Penalties typically 10-25%
                    estimatedPenalties += estimatedBackTaxes * 0.15;
                }
            }
        }

        return {
            registeredJurisdictions: exposures.filter(e => e.isRegistered).length,
            unregisteredWithNexus,
            estimatedBackTaxes,
            estimatedPenalties,
            estimatedOngoingAnnual,
        };
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private aggregateActivities(
        activities: NexusActivityEvent[],
        periodStart: Date,
        periodEnd: Date
    ): Map<JurisdictionCode, { current: PeriodActivity; trailing: { grossSales: number; transactionCount: number; employeeDays: number; propertyValue: number } }> {
        const result = new Map<JurisdictionCode, { current: PeriodActivity; trailing: { grossSales: number; transactionCount: number; employeeDays: number; propertyValue: number } }>();

        // Filter activities within period
        const relevantActivities = activities.filter(a =>
            a.eventDate >= periodStart && a.eventDate <= periodEnd
        );

        // Group by jurisdiction
        for (const activity of relevantActivities) {
            if (!result.has(activity.jurisdictionCode)) {
                result.set(activity.jurisdictionCode, {
                    current: this.createEmptyPeriodActivity(periodStart, periodEnd),
                    trailing: { grossSales: 0, transactionCount: 0, employeeDays: 0, propertyValue: 0 },
                });
            }

            const jurisdictionData = result.get(activity.jurisdictionCode)!;

            // Aggregate based on event type
            switch (activity.eventType) {
                case 'sale':
                    jurisdictionData.current.grossSales += activity.amount ?? 0;
                    jurisdictionData.current.transactionCount++;
                    jurisdictionData.trailing.grossSales += activity.amount ?? 0;
                    jurisdictionData.trailing.transactionCount++;
                    break;
                case 'employee_hire':
                    jurisdictionData.current.employeeCount++;
                    break;
                case 'employee_travel':
                    jurisdictionData.current.employeeDays += 1;
                    jurisdictionData.trailing.employeeDays += 1;
                    break;
                case 'property_acquisition':
                    jurisdictionData.current.propertyValue += activity.amount ?? 0;
                    jurisdictionData.trailing.propertyValue += activity.amount ?? 0;
                    break;
                case 'inventory_storage':
                    jurisdictionData.current.inventoryValue += activity.amount ?? 0;
                    break;
                case 'service_delivery':
                    jurisdictionData.current.servicesRevenue += activity.amount ?? 0;
                    break;
            }
        }

        return result;
    }

    private createEmptyPeriodActivity(periodStart: Date, periodEnd: Date): PeriodActivity {
        return {
            periodStart,
            periodEnd,
            grossSales: 0,
            taxableSales: 0,
            exemptSales: 0,
            transactionCount: 0,
            employeeCount: 0,
            employeeDays: 0,
            propertyValue: 0,
            inventoryValue: 0,
            servicesRevenue: 0,
            servicesDays: 0,
            payrollAmount: 0,
        };
    }

    private eventToPeriodActivity(event: NexusActivityEvent): PeriodActivity {
        const activity = this.createEmptyPeriodActivity(event.eventDate, event.eventDate);

        if (event.eventType === 'sale') {
            activity.grossSales = event.amount ?? 0;
            activity.transactionCount = 1;
        }

        return activity;
    }

    private calculateComplianceStatus(exposures: JurisdictionNexusExposure[]): void {
        for (const exposure of exposures) {
            if (exposure.salesTaxNexus.status === 'established') {
                exposure.isCompliant = exposure.isRegistered &&
                    (exposure.lastFilingDate !== undefined || exposure.registrationDate !== undefined);
            } else {
                exposure.isCompliant = true;  // No nexus = no compliance requirement
            }
        }
    }

    private generateRecommendations(exposures: JurisdictionNexusExposure[]): NexusRecommendation[] {
        const recommendations: NexusRecommendation[] = [];

        for (const exposure of exposures) {
            // Recommend registration for unregistered nexus
            if (exposure.salesTaxNexus.status === 'established' && !exposure.isRegistered) {
                recommendations.push({
                    jurisdictionCode: exposure.jurisdictionCode,
                    priority: 'high',
                    recommendationType: 'register',
                    description: `Register for sales tax in ${exposure.jurisdictionName}. Economic nexus threshold exceeded.`,
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                });

                // Consider VDA if significant back exposure
                if (exposure.trailingMetrics.grossSales > 500000) {
                    recommendations.push({
                        jurisdictionCode: exposure.jurisdictionCode,
                        priority: 'high',
                        recommendationType: 'file_vda',
                        description: `Consider Voluntary Disclosure Agreement in ${exposure.jurisdictionName} to reduce penalties.`,
                        estimatedBenefit: exposure.trailingMetrics.grossSales * 0.01, // Estimated penalty savings
                    });
                }
            }

            // Recommend monitoring for approaching thresholds
            if (exposure.salesTaxNexus.status === 'approaching') {
                recommendations.push({
                    jurisdictionCode: exposure.jurisdictionCode,
                    priority: 'medium',
                    recommendationType: 'monitor',
                    description: `Monitor sales activity in ${exposure.jurisdictionName}. Currently at ${Math.round(exposure.salesTaxNexus.salesThresholdPercent)}% of threshold.`,
                });
            }

            // Low activity - consider restructuring or ceasing
            if (exposure.riskScore > 50 && exposure.trailingMetrics.grossSales < 10000) {
                recommendations.push({
                    jurisdictionCode: exposure.jurisdictionCode,
                    priority: 'low',
                    recommendationType: 'restructure',
                    description: `Consider restructuring activities in ${exposure.jurisdictionName} - low sales but nexus exposure.`,
                });
            }
        }

        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    private buildSummary(exposures: JurisdictionNexusExposure[]): NexusStudy['summary'] {
        const exposureEstimate = this.estimateTotalExposure(exposures);

        return {
            totalJurisdictions: exposures.length,
            nexusEstablished: exposures.filter(e => e.salesTaxNexus.status === 'established').length,
            nexusApproaching: exposures.filter(e => e.salesTaxNexus.status === 'approaching').length,
            registeredJurisdictions: exposureEstimate.registeredJurisdictions,
            unregisteredWithNexus: exposureEstimate.unregisteredWithNexus,
            totalEstimatedExposure: exposureEstimate.estimatedBackTaxes + exposureEstimate.estimatedPenalties,
        };
    }

    private calculateNextFilingDate(frequency: string): Date {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        switch (frequency) {
            case 'monthly':
                // Due 20th of following month
                const nextMonth = new Date(year, month + 1, 20);
                return nextMonth;
            case 'quarterly':
                // Due 20th of month after quarter end
                const currentQuarter = Math.floor(month / 3);
                const quarterEndMonth = (currentQuarter + 1) * 3;
                return new Date(year, quarterEndMonth + 1, 20);
            case 'annual':
                // Due April 15 of following year
                return new Date(year + 1, 3, 15);
            default:
                return new Date(year, month + 3, 20);
        }
    }
}

// Export singleton
export const nexusMonitoringAgent = new NexusMonitoringAgent();
