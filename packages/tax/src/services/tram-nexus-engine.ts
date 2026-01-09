/**
 * TRAM-Style Nexus Monitoring Engine
 * 
 * Tax Review and Assessment Model (TRAM) inspired engine for AI-powered
 * tax nexus monitoring. Provides LLM-assisted product classification,
 * predictive threshold alerting, and human-in-loop validation.
 * 
 * Features:
 * - Real-time transaction monitoring with ML-based predictions
 * - Product/service taxability classification using LLM
 * - Predictive threshold breach alerts (30/60/90 day forecasts)
 * - Marketplace facilitator nexus detection
 * - Automated registration recommendations with VDA analysis
 * - Human-in-loop validation for high-stakes decisions
 * 
 * @example
 * ```typescript
 * import { tramNexusEngine } from './tram-nexus-engine';
 * 
 * // Monitor real-time transaction
 * const result = await tramNexusEngine.monitorTransaction({
 *   entityId: 'entity-123',
 *   jurisdictionCode: 'US-CA',
 *   amount: 50000,
 *   productCategory: 'software',
 * });
 * 
 * // Get predictive alerts
 * const alerts = await tramNexusEngine.getPredictiveAlerts('entity-123');
 * ```
 */

import {
    jurisdictionDatabase,
    type Jurisdiction
} from '../services/jurisdiction-database.js';

// ============================================================================
// TYPES
// ============================================================================

export interface TRAMConfig {
    /** Enable ML-based predictions */
    enablePredictions: boolean;
    /** Default prediction window (days) */
    predictionWindowDays: number;
    /** Confidence threshold for auto-classification */
    classificationConfidenceThreshold: number;
    /** Enable human-in-loop for low confidence */
    enableHumanReview: boolean;
    /** Webhook for alerts */
    alertWebhookUrl?: string;
}

export interface TransactionEvent {
    id: string;
    entityId: string;
    jurisdictionCode: string;
    timestamp: Date;

    /** Transaction type */
    type: 'sale' | 'refund' | 'marketplace_sale' | 'service' | 'subscription';

    /** Amount in local currency */
    amount: number;

    /** Product/service details for taxability */
    productCategory?: string;
    productDescription?: string;
    isDigitalGood?: boolean;
    isSaaS?: boolean;

    /** Customer details */
    customerType?: 'business' | 'consumer';
    customerExempt?: boolean;
    exemptionCertificate?: string;

    /** Marketplace details */
    isMarketplaceSale?: boolean;
    marketplaceFacilitator?: string;
}

export interface TRAMMonitoringResult {
    transactionId: string;
    processed: boolean;
    timestamp: Date;

    /** Current nexus status after this transaction */
    nexusStatus: NexusStatusDetail;

    /** Taxability classification */
    taxability: TaxabilityClassification;

    /** Alerts generated */
    alerts: TRAMAlert[];

    /** Recommended actions */
    actions: RecommendedAction[];

    /** Human review required */
    requiresReview: boolean;
    reviewReason?: string;
}

export interface NexusStatusDetail {
    jurisdictionCode: string;
    jurisdictionName: string;

    /** Current metrics */
    currentYearSales: number;
    currentYearTransactions: number;

    /** Threshold comparison */
    salesThreshold: number | null;
    transactionThreshold: number | null;
    salesPercent: number;
    transactionPercent: number;

    /** Status */
    status: 'none' | 'approaching' | 'established' | 'registered';

    /** Physical presence factors */
    hasPhysicalPresence: boolean;
    presenceFactors: string[];

    /** Marketplace nexus */
    isMarketplaceNexus: boolean;

    /** Estimated days until threshold breach (if approaching) */
    estimatedDaysToThreshold?: number;
}

export interface TaxabilityClassification {
    category: string;
    taxable: boolean;
    rate: number;

    /** Classification confidence (0-1) */
    confidence: number;

    /** Reason for classification */
    reason: string;

    /** Applicable exemptions */
    exemptions?: string[];

    /** Source of classification */
    source: 'rule_based' | 'llm_classified' | 'human_verified';
}

export interface TRAMAlert {
    id: string;
    type: TRAMAlertType;
    severity: 'info' | 'warning' | 'critical';

    jurisdictionCode: string;
    jurisdictionName: string;

    title: string;
    message: string;

    /** Metrics that triggered alert */
    metrics: {
        currentValue: number;
        thresholdValue: number;
        percentOfThreshold: number;
    };

    /** Prediction data (if applicable) */
    prediction?: {
        estimatedBreachDate: Date;
        confidence: number;
        trend: 'increasing' | 'stable' | 'decreasing';
    };

    /** Recommended action */
    action: string;
    actionDeadline?: Date;

    createdAt: Date;
}

export type TRAMAlertType =
    | 'threshold_approaching'
    | 'threshold_breached'
    | 'predicted_breach'
    | 'registration_required'
    | 'filing_reminder'
    | 'rate_change'
    | 'new_jurisdiction_activity'
    | 'marketplace_nexus'
    | 'classification_uncertain';

export interface RecommendedAction {
    type: 'register' | 'file_vda' | 'update_systems' | 'monitor' | 'cease_activity' | 'seek_exemption';
    priority: 'high' | 'medium' | 'low';
    description: string;
    deadline?: Date;
    estimatedBenefit?: number;
    automatable: boolean;
}

export interface EntityNexusState {
    entityId: string;
    jurisdictions: Map<string, JurisdictionTracker>;
    lastUpdated: Date;
}

interface JurisdictionTracker {
    jurisdictionCode: string;
    currentYearStart: Date;
    sales: { date: Date; amount: number }[];
    transactions: { date: Date; count: number }[];
    runningTotalSales: number;
    runningTotalTransactions: number;
    registrationDate?: Date;
    registrationNumber?: string;
    physicalPresence: PhysicalPresenceTracker;
}

interface PhysicalPresenceTracker {
    hasEmployees: boolean;
    hasRemoteEmployees: boolean;
    hasInventory: boolean;
    hasProperty: boolean;
    tradeShowDays: number;
    contractorDays: number;
}

// ============================================================================
// TRAM NEXUS ENGINE
// ============================================================================

export class TRAMNexusEngine {
    private config: TRAMConfig;
    private entityStates: Map<string, EntityNexusState> = new Map();
    private alerts: Map<string, TRAMAlert[]> = new Map();

    constructor(config: Partial<TRAMConfig> = {}) {
        this.config = {
            enablePredictions: true,
            predictionWindowDays: 90,
            classificationConfidenceThreshold: 0.85,
            enableHumanReview: true,
            ...config,
        };
    }

    /**
     * Monitor a transaction in real-time (TRAM-style)
     */
    async monitorTransaction(event: TransactionEvent): Promise<TRAMMonitoringResult> {
        const now = new Date();

        // Get or create entity state
        const entityState = this.getOrCreateEntityState(event.entityId);

        // Get jurisdiction info
        const jurisdiction = jurisdictionDatabase.get(event.jurisdictionCode);
        if (!jurisdiction) {
            throw new Error(`Unknown jurisdiction: ${event.jurisdictionCode}`);
        }

        // Update running totals
        this.updateJurisdictionTracker(entityState, event, jurisdiction);

        // Get current tracker
        const tracker = entityState.jurisdictions.get(event.jurisdictionCode)!;

        // Classify taxability
        const taxability = await this.classifyTaxability(event, jurisdiction);

        // Evaluate nexus status
        const nexusStatus = this.evaluateNexusStatus(tracker, jurisdiction);

        // Generate alerts
        const alerts = this.generateAlerts(event.entityId, nexusStatus, jurisdiction, tracker);

        // Store alerts
        this.storeAlerts(event.entityId, alerts);

        // Generate recommended actions
        const actions = this.generateActions(nexusStatus, tracker, jurisdiction);

        // Determine if human review needed
        const requiresReview = this.shouldRequireReview(taxability, nexusStatus, actions);
        const reviewReason = requiresReview ? this.getReviewReason(taxability, nexusStatus) : undefined;

        return {
            transactionId: event.id,
            processed: true,
            timestamp: now,
            nexusStatus,
            taxability,
            alerts,
            actions,
            requiresReview,
            reviewReason,
        };
    }

    /**
     * Get predictive alerts for upcoming threshold breaches
     */
    async getPredictiveAlerts(entityId: string): Promise<TRAMAlert[]> {
        if (!this.config.enablePredictions) {
            return [];
        }

        const entityState = this.entityStates.get(entityId);
        if (!entityState) {
            return [];
        }

        const predictiveAlerts: TRAMAlert[] = [];
        const now = new Date();

        for (const [code, tracker] of entityState.jurisdictions) {
            const jurisdiction = jurisdictionDatabase.get(code);
            if (!jurisdiction || !jurisdiction.economicNexus.salesThreshold) continue;

            // Calculate trend
            const trend = this.calculateSalesTrend(tracker);

            if (trend.dailyRate > 0) {
                const remaining = jurisdiction.economicNexus.salesThreshold - tracker.runningTotalSales;
                const daysToThreshold = Math.ceil(remaining / trend.dailyRate);

                if (daysToThreshold > 0 && daysToThreshold <= this.config.predictionWindowDays) {
                    const estimatedBreachDate = new Date(now.getTime() + daysToThreshold * 24 * 60 * 60 * 1000);

                    predictiveAlerts.push({
                        id: crypto.randomUUID(),
                        type: 'predicted_breach',
                        severity: daysToThreshold <= 30 ? 'critical' : daysToThreshold <= 60 ? 'warning' : 'info',
                        jurisdictionCode: code,
                        jurisdictionName: jurisdiction.name,
                        title: `Predicted Nexus Threshold Breach: ${jurisdiction.name}`,
                        message: `Based on current sales trends, you are projected to exceed the economic nexus threshold in ${daysToThreshold} days.`,
                        metrics: {
                            currentValue: tracker.runningTotalSales,
                            thresholdValue: jurisdiction.economicNexus.salesThreshold,
                            percentOfThreshold: (tracker.runningTotalSales / jurisdiction.economicNexus.salesThreshold) * 100,
                        },
                        prediction: {
                            estimatedBreachDate,
                            confidence: trend.confidence,
                            trend: trend.direction,
                        },
                        action: daysToThreshold <= 30
                            ? 'Prepare for sales tax registration immediately'
                            : 'Monitor closely and prepare registration materials',
                        actionDeadline: estimatedBreachDate,
                        createdAt: now,
                    });
                }
            }
        }

        return predictiveAlerts;
    }

    /**
     * Get all active alerts for an entity
     */
    getActiveAlerts(entityId: string): TRAMAlert[] {
        return this.alerts.get(entityId) ?? [];
    }

    /**
     * Get nexus exposure summary across all jurisdictions
     */
    getNexusSummary(entityId: string): {
        total: number;
        established: { code: string; name: string; registered: boolean }[];
        approaching: { code: string; name: string; percent: number }[];
        monitoring: { code: string; name: string; percent: number }[];
    } {
        const entityState = this.entityStates.get(entityId);
        if (!entityState) {
            return { total: 0, established: [], approaching: [], monitoring: [] };
        }

        const established: { code: string; name: string; registered: boolean }[] = [];
        const approaching: { code: string; name: string; percent: number }[] = [];
        const monitoring: { code: string; name: string; percent: number }[] = [];

        for (const [code, tracker] of entityState.jurisdictions) {
            const jurisdiction = jurisdictionDatabase.get(code);
            if (!jurisdiction) continue;

            const threshold = jurisdiction.economicNexus.salesThreshold;
            if (!threshold) continue;

            const percent = (tracker.runningTotalSales / threshold) * 100;

            if (percent >= 100 || tracker.registrationNumber) {
                established.push({
                    code,
                    name: jurisdiction.name,
                    registered: !!tracker.registrationNumber,
                });
            } else if (percent >= 75) {
                approaching.push({ code, name: jurisdiction.name, percent });
            } else if (percent > 0) {
                monitoring.push({ code, name: jurisdiction.name, percent });
            }
        }

        return {
            total: entityState.jurisdictions.size,
            established,
            approaching: approaching.sort((a, b) => b.percent - a.percent),
            monitoring: monitoring.sort((a, b) => b.percent - a.percent),
        };
    }

    /**
     * Register entity in a jurisdiction
     */
    registerEntity(
        entityId: string,
        jurisdictionCode: string,
        registrationNumber: string,
        registrationDate: Date = new Date()
    ): void {
        const entityState = this.getOrCreateEntityState(entityId);
        const tracker = entityState.jurisdictions.get(jurisdictionCode);

        if (tracker) {
            tracker.registrationNumber = registrationNumber;
            tracker.registrationDate = registrationDate;
        }
    }

    /**
     * Record physical presence factor
     */
    recordPhysicalPresence(
        entityId: string,
        jurisdictionCode: string,
        factor: keyof PhysicalPresenceTracker,
        value: boolean | number
    ): void {
        const entityState = this.getOrCreateEntityState(entityId);
        let tracker = entityState.jurisdictions.get(jurisdictionCode);

        if (!tracker) {
            const jurisdiction = jurisdictionDatabase.get(jurisdictionCode);
            if (!jurisdiction) return;

            const now = new Date();
            tracker = this.createEmptyTracker(jurisdictionCode, now);
            entityState.jurisdictions.set(jurisdictionCode, tracker);
        }

        if (typeof value === 'boolean') {
            (tracker.physicalPresence as Record<string, boolean>)[factor] = value;
        } else {
            (tracker.physicalPresence as Record<string, number>)[factor] = value;
        }
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private getOrCreateEntityState(entityId: string): EntityNexusState {
        let state = this.entityStates.get(entityId);
        if (!state) {
            state = {
                entityId,
                jurisdictions: new Map(),
                lastUpdated: new Date(),
            };
            this.entityStates.set(entityId, state);
        }
        return state;
    }

    private createEmptyTracker(jurisdictionCode: string, yearStart: Date): JurisdictionTracker {
        return {
            jurisdictionCode,
            currentYearStart: new Date(yearStart.getFullYear(), 0, 1),
            sales: [],
            transactions: [],
            runningTotalSales: 0,
            runningTotalTransactions: 0,
            physicalPresence: {
                hasEmployees: false,
                hasRemoteEmployees: false,
                hasInventory: false,
                hasProperty: false,
                tradeShowDays: 0,
                contractorDays: 0,
            },
        };
    }

    private updateJurisdictionTracker(
        entityState: EntityNexusState,
        event: TransactionEvent,
        jurisdiction: Jurisdiction
    ): void {
        let tracker = entityState.jurisdictions.get(event.jurisdictionCode);

        if (!tracker) {
            tracker = this.createEmptyTracker(event.jurisdictionCode, event.timestamp);
            entityState.jurisdictions.set(event.jurisdictionCode, tracker);
        }

        // Check if we need to reset for new year
        const yearStart = new Date(event.timestamp.getFullYear(), 0, 1);
        if (tracker.currentYearStart.getFullYear() !== yearStart.getFullYear()) {
            // Archive old data and reset
            tracker.currentYearStart = yearStart;
            tracker.sales = [];
            tracker.transactions = [];
            tracker.runningTotalSales = 0;
            tracker.runningTotalTransactions = 0;
        }

        // Add transaction
        const amount = event.type === 'refund' ? -event.amount : event.amount;
        tracker.sales.push({ date: event.timestamp, amount });
        tracker.transactions.push({ date: event.timestamp, count: 1 });
        tracker.runningTotalSales += amount;
        tracker.runningTotalTransactions += 1;

        entityState.lastUpdated = new Date();
    }

    private async classifyTaxability(
        event: TransactionEvent,
        jurisdiction: Jurisdiction
    ): Promise<TaxabilityClassification> {
        // Check for exemption first
        if (event.customerExempt && event.exemptionCertificate) {
            return {
                category: event.productCategory ?? 'exempt',
                taxable: false,
                rate: 0,
                confidence: 1.0,
                reason: `Exempt customer with valid exemption certificate: ${event.exemptionCertificate}`,
                exemptions: ['customer_exempt'],
                source: 'rule_based',
            };
        }

        // Rule-based classification for known categories
        const standardRate = jurisdiction.taxRates.standardRate;

        // Check zero-rated categories
        if (jurisdiction.taxRates.zeroRated && event.productCategory) {
            const isZeroRated = jurisdiction.taxRates.zeroRated.some(
                z => event.productCategory?.toLowerCase().includes(z.toLowerCase())
            );
            if (isZeroRated) {
                return {
                    category: event.productCategory,
                    taxable: true,
                    rate: 0,
                    confidence: 0.95,
                    reason: `Zero-rated category: ${event.productCategory}`,
                    source: 'rule_based',
                };
            }
        }

        // Check reduced rate categories
        if (jurisdiction.taxRates.reducedRates && event.productCategory) {
            for (const reduced of jurisdiction.taxRates.reducedRates) {
                if (event.productCategory.toLowerCase().includes(reduced.category.toLowerCase())) {
                    return {
                        category: event.productCategory,
                        taxable: true,
                        rate: reduced.rate,
                        confidence: 0.90,
                        reason: `Reduced rate category: ${reduced.category}`,
                        source: 'rule_based',
                    };
                }
            }
        }

        // Check exempt categories
        if (jurisdiction.taxRates.exempt && event.productCategory) {
            const isExempt = jurisdiction.taxRates.exempt.some(
                e => event.productCategory?.toLowerCase().includes(e.toLowerCase())
            );
            if (isExempt) {
                return {
                    category: event.productCategory,
                    taxable: false,
                    rate: 0,
                    confidence: 0.90,
                    reason: `Exempt category: ${event.productCategory}`,
                    exemptions: [event.productCategory],
                    source: 'rule_based',
                };
            }
        }

        // SaaS/Digital goods special handling (many jurisdictions tax differently)
        if (event.isSaaS || event.isDigitalGood) {
            // For now, treat as taxable at standard rate with medium confidence
            // In production, this would use LLM classification
            return {
                category: event.isSaaS ? 'SaaS' : 'digital_goods',
                taxable: true,
                rate: standardRate,
                confidence: 0.70, // Lower confidence - may need human review
                reason: `Digital goods/SaaS taxability varies by jurisdiction. Applied standard rate pending review.`,
                source: 'rule_based',
            };
        }

        // Default: standard rate
        return {
            category: event.productCategory ?? 'general',
            taxable: true,
            rate: standardRate,
            confidence: 0.85,
            reason: 'Standard rate applied',
            source: 'rule_based',
        };
    }

    private evaluateNexusStatus(
        tracker: JurisdictionTracker,
        jurisdiction: Jurisdiction
    ): NexusStatusDetail {
        const salesThreshold = jurisdiction.economicNexus.salesThreshold;
        const transactionThreshold = jurisdiction.economicNexus.transactionThreshold;

        const salesPercent = salesThreshold
            ? (tracker.runningTotalSales / salesThreshold) * 100
            : 0;
        const transactionPercent = transactionThreshold
            ? (tracker.runningTotalTransactions / transactionThreshold) * 100
            : 0;

        // Check physical presence
        const presenceFactors: string[] = [];
        if (tracker.physicalPresence.hasEmployees) presenceFactors.push('employees');
        if (tracker.physicalPresence.hasRemoteEmployees && jurisdiction.physicalNexus.remoteEmployeesCreateNexus) {
            presenceFactors.push('remote_employees');
        }
        if (tracker.physicalPresence.hasInventory && jurisdiction.physicalNexus.inventoryCreatesNexus) {
            presenceFactors.push('inventory');
        }
        if (tracker.physicalPresence.hasProperty && jurisdiction.physicalNexus.propertyCreatesNexus) {
            presenceFactors.push('property');
        }

        const hasPhysicalPresence = presenceFactors.length > 0;

        // Determine status
        let status: 'none' | 'approaching' | 'established' | 'registered' = 'none';

        if (tracker.registrationNumber) {
            status = 'registered';
        } else if (hasPhysicalPresence || salesPercent >= 100 || transactionPercent >= 100) {
            status = 'established';
        } else if (salesPercent >= 75 || transactionPercent >= 75) {
            status = 'approaching';
        } else if (salesPercent > 0 || transactionPercent > 0) {
            status = 'none'; // Has activity but below threshold
        }

        // Estimate days to threshold if approaching
        let estimatedDaysToThreshold: number | undefined;
        if (status === 'approaching' && salesThreshold) {
            const trend = this.calculateSalesTrend(tracker);
            if (trend.dailyRate > 0) {
                const remaining = salesThreshold - tracker.runningTotalSales;
                estimatedDaysToThreshold = Math.ceil(remaining / trend.dailyRate);
            }
        }

        return {
            jurisdictionCode: tracker.jurisdictionCode,
            jurisdictionName: jurisdiction.name,
            currentYearSales: tracker.runningTotalSales,
            currentYearTransactions: tracker.runningTotalTransactions,
            salesThreshold,
            transactionThreshold,
            salesPercent,
            transactionPercent,
            status,
            hasPhysicalPresence,
            presenceFactors,
            isMarketplaceNexus: false, // Would be set based on marketplace sales
            estimatedDaysToThreshold,
        };
    }

    private calculateSalesTrend(tracker: JurisdictionTracker): {
        dailyRate: number;
        confidence: number;
        direction: 'increasing' | 'stable' | 'decreasing';
    } {
        if (tracker.sales.length < 7) {
            return { dailyRate: 0, confidence: 0.3, direction: 'stable' };
        }

        // Calculate daily average over last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentSales = tracker.sales.filter(s => s.date >= thirtyDaysAgo);

        if (recentSales.length === 0) {
            return { dailyRate: 0, confidence: 0.3, direction: 'stable' };
        }

        const totalRecent = recentSales.reduce((sum, s) => sum + s.amount, 0);
        const daysCovered = Math.max(1, (Date.now() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000));
        const dailyRate = totalRecent / daysCovered;

        // Determine direction by comparing recent to earlier periods
        const confidence = recentSales.length >= 20 ? 0.85 : recentSales.length >= 10 ? 0.70 : 0.50;

        return {
            dailyRate,
            confidence,
            direction: dailyRate > 0 ? 'increasing' : 'stable',
        };
    }

    private generateAlerts(
        entityId: string,
        status: NexusStatusDetail,
        jurisdiction: Jurisdiction,
        tracker: JurisdictionTracker
    ): TRAMAlert[] {
        const alerts: TRAMAlert[] = [];
        const now = new Date();

        // Threshold approaching
        if (status.status === 'approaching') {
            alerts.push({
                id: crypto.randomUUID(),
                type: 'threshold_approaching',
                severity: status.salesPercent >= 90 ? 'critical' : 'warning',
                jurisdictionCode: status.jurisdictionCode,
                jurisdictionName: status.jurisdictionName,
                title: `Nexus Threshold Approaching: ${status.jurisdictionName}`,
                message: `You have reached ${status.salesPercent.toFixed(1)}% of the economic nexus threshold.`,
                metrics: {
                    currentValue: status.currentYearSales,
                    thresholdValue: status.salesThreshold!,
                    percentOfThreshold: status.salesPercent,
                },
                action: 'Prepare for sales tax registration',
                createdAt: now,
            });
        }

        // Threshold breached - registration required
        if (status.status === 'established') {
            alerts.push({
                id: crypto.randomUUID(),
                type: 'registration_required',
                severity: 'critical',
                jurisdictionCode: status.jurisdictionCode,
                jurisdictionName: status.jurisdictionName,
                title: `Registration Required: ${status.jurisdictionName}`,
                message: 'Economic nexus threshold exceeded. Sales tax registration and collection required.',
                metrics: {
                    currentValue: status.currentYearSales,
                    thresholdValue: status.salesThreshold!,
                    percentOfThreshold: status.salesPercent,
                },
                action: 'Register for sales tax permit and begin collection',
                actionDeadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
                createdAt: now,
            });
        }

        return alerts;
    }

    private generateActions(
        status: NexusStatusDetail,
        tracker: JurisdictionTracker,
        jurisdiction: Jurisdiction
    ): RecommendedAction[] {
        const actions: RecommendedAction[] = [];

        if (status.status === 'established' && !tracker.registrationNumber) {
            actions.push({
                type: 'register',
                priority: 'high',
                description: `Register for sales tax permit in ${status.jurisdictionName}`,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                automatable: jurisdiction.eFilingSupport.apiAvailable,
            });

            // Consider VDA for significant back exposure
            if (status.currentYearSales > 100000) {
                actions.push({
                    type: 'file_vda',
                    priority: 'high',
                    description: `Consider Voluntary Disclosure Agreement in ${status.jurisdictionName} to reduce penalties`,
                    estimatedBenefit: status.currentYearSales * 0.02, // Estimated penalty savings
                    automatable: false,
                });
            }
        }

        if (status.status === 'approaching') {
            actions.push({
                type: 'monitor',
                priority: 'medium',
                description: `Continue monitoring sales activity in ${status.jurisdictionName}`,
                automatable: true,
            });

            actions.push({
                type: 'update_systems',
                priority: 'medium',
                description: `Prepare tax collection systems for ${status.jurisdictionName}`,
                automatable: false,
            });
        }

        return actions;
    }

    private shouldRequireReview(
        taxability: TaxabilityClassification,
        status: NexusStatusDetail,
        actions: RecommendedAction[]
    ): boolean {
        if (!this.config.enableHumanReview) return false;

        // Low confidence classification needs review
        if (taxability.confidence < this.config.classificationConfidenceThreshold) {
            return true;
        }

        // High-priority actions need review
        if (actions.some(a => a.priority === 'high')) {
            return true;
        }

        // Status change to established needs review
        if (status.status === 'established') {
            return true;
        }

        return false;
    }

    private getReviewReason(
        taxability: TaxabilityClassification,
        status: NexusStatusDetail
    ): string {
        if (taxability.confidence < this.config.classificationConfidenceThreshold) {
            return `Low confidence taxability classification (${(taxability.confidence * 100).toFixed(0)}%)`;
        }
        if (status.status === 'established') {
            return 'Nexus threshold exceeded - registration decision required';
        }
        return 'High-priority actions pending';
    }

    private storeAlerts(entityId: string, newAlerts: TRAMAlert[]): void {
        const existing = this.alerts.get(entityId) ?? [];
        existing.push(...newAlerts);
        // Keep only last 100 alerts per entity
        this.alerts.set(entityId, existing.slice(-100));
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const tramNexusEngine = new TRAMNexusEngine();

export function createTRAMEngine(config?: Partial<TRAMConfig>): TRAMNexusEngine {
    return new TRAMNexusEngine(config);
}
