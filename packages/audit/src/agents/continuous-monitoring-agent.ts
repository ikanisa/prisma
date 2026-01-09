/**
 * Continuous Monitoring Agent
 * 
 * Real-time anomaly detection and compliance monitoring for financial data.
 * Processes transaction streams, detects threshold breaches, and triggers
 * escalation workflows.
 * 
 * @example
 * ```typescript
 * const agent = new ContinuousMonitoringAgent(config);
 * 
 * // Process transaction
 * const result = await agent.processTransaction(transaction);
 * 
 * // Get active alerts
 * const alerts = agent.getActiveAlerts('engagement-123');
 * 
 * // Run batch analysis
 * const report = await agent.runBatchAnalysis(transactions);
 * ```
 */

import { AnomalyDetector } from '../../ai-engine/src/services/anomaly-detector.js';
import {
    analyzeBenfordDistribution,
    detectZScoreOutliers,
    calculateMultiFactorRiskScore,
} from '../../audit/src/utils/statistical-analysis.js';

// ============================================================================
// TYPES
// ============================================================================

export interface MonitoringRule {
    id: string;
    name: string;
    description: string;
    category: RuleCategory;

    // Trigger conditions
    conditions: RuleCondition[];
    conditionOperator: 'AND' | 'OR';

    // Thresholds
    thresholds?: {
        warning: number;
        critical: number;
    };

    // Response
    severity: 'info' | 'warning' | 'critical';
    actions: RuleAction[];

    // Configuration
    enabled: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    cooldownMinutes?: number;  // Prevent alert flooding
}

export type RuleCategory =
    | 'anomaly'
    | 'threshold'
    | 'pattern'
    | 'compliance'
    | 'fraud'
    | 'operational';

export interface RuleCondition {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'regex' | 'between';
    value: string | number | [number, number];
    aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
    timeWindow?: { value: number; unit: 'minutes' | 'hours' | 'days' };
}

export type RuleAction =
    | { type: 'alert'; channel: 'email' | 'slack' | 'dashboard' | 'sms' }
    | { type: 'escalate'; to: string }
    | { type: 'block'; reason: string }
    | { type: 'log'; level: 'info' | 'warn' | 'error' }
    | { type: 'webhook'; url: string };

export interface MonitoringAlert {
    id: string;
    ruleId: string;
    ruleName: string;

    // Context
    engagementId: string;
    entityId?: string;
    transactionId?: string;

    // Alert details
    category: RuleCategory;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;

    // Data
    triggeredValue?: number;
    thresholdValue?: number;
    anomalyScore?: number;
    relatedTransactions?: string[];

    // Timestamps
    triggeredAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolution?: string;

    // Status
    status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
}

export interface Transaction {
    id: string;
    engagementId: string;
    date: Date;
    accountCode: string;
    accountName: string;
    amount: number;
    description: string;
    type: 'debit' | 'credit';
    counterparty?: string;
    category?: string;
    metadata?: Record<string, unknown>;
}

export interface MonitoringReport {
    periodStart: Date;
    periodEnd: Date;
    engagementId: string;

    // Statistics
    transactionsProcessed: number;
    alertsRaised: number;
    alertsByCategory: Record<RuleCategory, number>;
    alertsBySeverity: Record<string, number>;

    // Top issues
    topAlerts: MonitoringAlert[];

    // Trends
    anomalyTrend: { date: string; count: number }[];

    // Risk score
    overallRiskScore: number;
    riskFactors: string[];
}

// ============================================================================
// DEFAULT MONITORING RULES
// ============================================================================

const DEFAULT_RULES: MonitoringRule[] = [
    {
        id: 'rule-001',
        name: 'Large Transaction',
        description: 'Single transaction exceeds materiality threshold',
        category: 'threshold',
        conditions: [{ field: 'amount', operator: 'gt', value: 1000000 }],
        conditionOperator: 'AND',
        severity: 'warning',
        actions: [{ type: 'alert', channel: 'dashboard' }],
        enabled: true,
        frequency: 'realtime',
    },
    {
        id: 'rule-002',
        name: 'Unusual Hour Transaction',
        description: 'Transaction posted outside business hours',
        category: 'anomaly',
        conditions: [
            { field: 'hour', operator: 'lt', value: 6 },
            { field: 'hour', operator: 'gt', value: 22 },
        ],
        conditionOperator: 'OR',
        severity: 'info',
        actions: [{ type: 'log', level: 'info' }],
        enabled: true,
        frequency: 'realtime',
    },
    {
        id: 'rule-003',
        name: 'Round Amount',
        description: 'Transaction with suspicious round amount',
        category: 'fraud',
        conditions: [
            { field: 'amount', operator: 'gt', value: 10000 },
            { field: 'isRound', operator: 'eq', value: true },
        ],
        conditionOperator: 'AND',
        severity: 'warning',
        actions: [{ type: 'alert', channel: 'dashboard' }],
        enabled: true,
        frequency: 'realtime',
    },
    {
        id: 'rule-004',
        name: 'Duplicate Detection',
        description: 'Potential duplicate transaction',
        category: 'operational',
        conditions: [{ field: 'isDuplicate', operator: 'eq', value: true }],
        conditionOperator: 'AND',
        severity: 'warning',
        actions: [{ type: 'alert', channel: 'dashboard' }],
        enabled: true,
        frequency: 'realtime',
    },
    {
        id: 'rule-005',
        name: 'High Volume Account',
        description: 'Account has unusually high transaction volume',
        category: 'anomaly',
        conditions: [
            {
                field: 'transactionCount',
                operator: 'gt',
                value: 100,
                aggregation: 'count',
                timeWindow: { value: 1, unit: 'days' },
            },
        ],
        conditionOperator: 'AND',
        severity: 'info',
        actions: [{ type: 'log', level: 'warn' }],
        enabled: true,
        frequency: 'daily',
    },
    {
        id: 'rule-006',
        name: 'Benford\'s Law Violation',
        description: 'Transaction amounts fail Benford\'s Law distribution',
        category: 'fraud',
        conditions: [{ field: 'benfordScore', operator: 'gt', value: 0.3 }],
        conditionOperator: 'AND',
        severity: 'critical',
        actions: [
            { type: 'alert', channel: 'dashboard' },
            { type: 'escalate', to: 'audit_manager' },
        ],
        enabled: true,
        frequency: 'daily',
    },
];

// ============================================================================
// CONTINUOUS MONITORING AGENT
// ============================================================================

export interface ContinuousMonitoringConfig {
    engagementId: string;
    materialityThreshold?: number;
    customRules?: MonitoringRule[];
    enableAnomalyDetection?: boolean;
    enableBenfordAnalysis?: boolean;
    alertRetentionDays?: number;
}

export class ContinuousMonitoringAgent {
    private config: ContinuousMonitoringConfig;
    private rules: MonitoringRule[];
    private alerts: Map<string, MonitoringAlert[]> = new Map();
    private transactionHistory: Map<string, Transaction[]> = new Map();
    private lastAlertTime: Map<string, Date> = new Map();

    constructor(config: ContinuousMonitoringConfig) {
        this.config = {
            enableAnomalyDetection: true,
            enableBenfordAnalysis: true,
            alertRetentionDays: 90,
            ...config,
        };

        // Initialize rules
        this.rules = [...DEFAULT_RULES];
        if (config.customRules) {
            this.rules.push(...config.customRules);
        }

        // Apply materiality threshold to relevant rules
        if (config.materialityThreshold) {
            this.updateMaterialityRules(config.materialityThreshold);
        }
    }

    /**
     * Process a single transaction in real-time
     */
    async processTransaction(transaction: Transaction): Promise<{
        processed: boolean;
        alerts: MonitoringAlert[];
        anomalyScore?: number;
    }> {
        const alerts: MonitoringAlert[] = [];
        let anomalyScore: number | undefined;

        // Store in history
        const history = this.transactionHistory.get(transaction.engagementId) ?? [];
        history.push(transaction);
        this.transactionHistory.set(transaction.engagementId, history);

        // Prepare enriched transaction data
        const enriched = this.enrichTransaction(transaction, history);

        // Check real-time rules
        const realtimeRules = this.rules.filter(r => r.enabled && r.frequency === 'realtime');
        for (const rule of realtimeRules) {
            if (this.evaluateRule(rule, enriched)) {
                const alert = this.createAlert(rule, transaction, enriched);
                if (alert) {
                    alerts.push(alert);
                    this.storeAlert(transaction.engagementId, alert);
                }
            }
        }

        // Anomaly detection
        if (this.config.enableAnomalyDetection && history.length >= 10) {
            const amounts = history.map(t => t.amount);
            const outliers = detectZScoreOutliers(amounts, 2.5);

            if (outliers.length > 0) {
                const lastIndex = history.length - 1;
                const isOutlier = outliers.some(o => o.index === lastIndex);

                if (isOutlier) {
                    anomalyScore = outliers.find(o => o.index === lastIndex)?.zScore;
                    const alert = this.createAnomalyAlert(transaction, anomalyScore ?? 0);
                    alerts.push(alert);
                    this.storeAlert(transaction.engagementId, alert);
                }
            }
        }

        return { processed: true, alerts, anomalyScore };
    }

    /**
     * Run batch analysis on a set of transactions
     */
    async runBatchAnalysis(transactions: Transaction[]): Promise<MonitoringReport> {
        const alerts: MonitoringAlert[] = [];
        const engagementId = transactions[0]?.engagementId ?? this.config.engagementId;
        const now = new Date();

        // Find date range
        const dates = transactions.map(t => t.date);
        const periodStart = new Date(Math.min(...dates.map(d => d.getTime())));
        const periodEnd = new Date(Math.max(...dates.map(d => d.getTime())));

        // Run Benford's Law analysis
        if (this.config.enableBenfordAnalysis && transactions.length >= 50) {
            const amounts = transactions.map(t => Math.abs(t.amount));
            const benfordResult = analyzeBenfordDistribution(amounts);

            if (!benfordResult.isConforming) {
                const alert: MonitoringAlert = {
                    id: crypto.randomUUID(),
                    ruleId: 'rule-006',
                    ruleName: "Benford's Law Violation",
                    engagementId,
                    category: 'fraud',
                    severity: 'critical',
                    title: "Transaction amounts fail Benford's Law test",
                    message: `Chi-square statistic: ${benfordResult.chiSquare.toFixed(2)}, p-value: ${benfordResult.pValue.toFixed(4)}. Suspicious digits: ${benfordResult.suspiciousDigits.join(', ')}`,
                    anomalyScore: benfordResult.chiSquare,
                    triggeredAt: now,
                    status: 'active',
                };
                alerts.push(alert);
            }
        }

        // Check daily/weekly rules
        const batchRules = this.rules.filter(r =>
            r.enabled && (r.frequency === 'daily' || r.frequency === 'weekly')
        );

        for (const rule of batchRules) {
            const ruleAlerts = this.evaluateBatchRule(rule, transactions);
            alerts.push(...ruleAlerts);
        }

        // Calculate risk score
        const amounts = transactions.map(t => t.amount);
        const factors = {
            financialHealth: 75,
            controlEnvironment: 70,
            industryRisk: 60,
            managementIntegrity: 80,
            auditHistory: 85,
            complexityOfOperations: 65,
            relatedPartyTransactions: 50,
            goingConcernIndicators: 90,
        };
        const riskResult = calculateMultiFactorRiskScore(factors);

        // Build report
        const alertsByCategory: Record<RuleCategory, number> = {
            anomaly: 0,
            threshold: 0,
            pattern: 0,
            compliance: 0,
            fraud: 0,
            operational: 0,
        };
        const alertsBySeverity: Record<string, number> = { info: 0, warning: 0, critical: 0 };

        for (const alert of alerts) {
            alertsByCategory[alert.category]++;
            alertsBySeverity[alert.severity]++;
        }

        return {
            periodStart,
            periodEnd,
            engagementId,
            transactionsProcessed: transactions.length,
            alertsRaised: alerts.length,
            alertsByCategory,
            alertsBySeverity,
            topAlerts: alerts.slice(0, 10),
            anomalyTrend: this.calculateAnomalyTrend(transactions),
            overallRiskScore: riskResult.overallScore,
            riskFactors: riskResult.riskLevel === 'high' ? riskResult.recommendations : [],
        };
    }

    /**
     * Get active alerts for an engagement
     */
    getActiveAlerts(engagementId: string): MonitoringAlert[] {
        const alerts = this.alerts.get(engagementId) ?? [];
        return alerts.filter(a => a.status === 'active');
    }

    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string, userId: string): boolean {
        for (const alerts of this.alerts.values()) {
            const alert = alerts.find(a => a.id === alertId);
            if (alert) {
                alert.status = 'acknowledged';
                alert.acknowledgedAt = new Date();
                alert.acknowledgedBy = userId;
                return true;
            }
        }
        return false;
    }

    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string, userId: string, resolution: string): boolean {
        for (const alerts of this.alerts.values()) {
            const alert = alerts.find(a => a.id === alertId);
            if (alert) {
                alert.status = 'resolved';
                alert.resolvedAt = new Date();
                alert.resolvedBy = userId;
                alert.resolution = resolution;
                return true;
            }
        }
        return false;
    }

    /**
     * Mark alert as false positive (for ML learning)
     */
    markFalsePositive(alertId: string, userId: string): boolean {
        for (const alerts of this.alerts.values()) {
            const alert = alerts.find(a => a.id === alertId);
            if (alert) {
                alert.status = 'false_positive';
                alert.resolvedAt = new Date();
                alert.resolvedBy = userId;
                alert.resolution = 'Marked as false positive';
                // In production, this would feed back to ML model
                return true;
            }
        }
        return false;
    }

    /**
     * Add custom monitoring rule
     */
    addRule(rule: MonitoringRule): void {
        this.rules.push(rule);
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private enrichTransaction(
        transaction: Transaction,
        history: Transaction[]
    ): Record<string, unknown> {
        const hour = transaction.date.getHours();
        const isRound = transaction.amount % 1000 === 0 && transaction.amount >= 1000;

        // Check for duplicates
        const duplicates = history.filter(t =>
            t.id !== transaction.id &&
            t.amount === transaction.amount &&
            t.accountCode === transaction.accountCode &&
            Math.abs(t.date.getTime() - transaction.date.getTime()) < 24 * 60 * 60 * 1000
        );
        const isDuplicate = duplicates.length > 0;

        return {
            ...transaction,
            hour,
            isRound,
            isDuplicate,
            transactionCount: history.length,
        };
    }

    private evaluateRule(rule: MonitoringRule, data: Record<string, unknown>): boolean {
        const results = rule.conditions.map(cond => this.evaluateCondition(cond, data));

        if (rule.conditionOperator === 'AND') {
            return results.every(r => r);
        } else {
            return results.some(r => r);
        }
    }

    private evaluateCondition(condition: RuleCondition, data: Record<string, unknown>): boolean {
        const value = data[condition.field];

        switch (condition.operator) {
            case 'eq': return value === condition.value;
            case 'ne': return value !== condition.value;
            case 'gt': return (value as number) > (condition.value as number);
            case 'gte': return (value as number) >= (condition.value as number);
            case 'lt': return (value as number) < (condition.value as number);
            case 'lte': return (value as number) <= (condition.value as number);
            case 'contains': return String(value).includes(String(condition.value));
            case 'regex': return new RegExp(String(condition.value)).test(String(value));
            case 'between': {
                const [min, max] = condition.value as [number, number];
                return (value as number) >= min && (value as number) <= max;
            }
            default: return false;
        }
    }

    private evaluateBatchRule(rule: MonitoringRule, transactions: Transaction[]): MonitoringAlert[] {
        const alerts: MonitoringAlert[] = [];
        const now = new Date();

        // Aggregate data based on rule conditions
        for (const condition of rule.conditions) {
            if (condition.aggregation) {
                const values = transactions.map(t => (t as unknown as Record<string, number>)[condition.field] ?? 0);
                let aggregated: number;

                switch (condition.aggregation) {
                    case 'sum': aggregated = values.reduce((a, b) => a + b, 0); break;
                    case 'avg': aggregated = values.reduce((a, b) => a + b, 0) / values.length; break;
                    case 'count': aggregated = values.length; break;
                    case 'max': aggregated = Math.max(...values); break;
                    case 'min': aggregated = Math.min(...values); break;
                    default: aggregated = 0;
                }

                if (this.evaluateCondition({ ...condition, field: 'aggregated' }, { aggregated })) {
                    alerts.push({
                        id: crypto.randomUUID(),
                        ruleId: rule.id,
                        ruleName: rule.name,
                        engagementId: this.config.engagementId,
                        category: rule.category,
                        severity: rule.severity,
                        title: rule.name,
                        message: rule.description,
                        triggeredValue: aggregated,
                        thresholdValue: condition.value as number,
                        triggeredAt: now,
                        status: 'active',
                    });
                }
            }
        }

        return alerts;
    }

    private createAlert(
        rule: MonitoringRule,
        transaction: Transaction,
        enriched: Record<string, unknown>
    ): MonitoringAlert | null {
        // Check cooldown
        const cooldownKey = `${rule.id}-${transaction.engagementId}`;
        const lastAlert = this.lastAlertTime.get(cooldownKey);
        if (lastAlert && rule.cooldownMinutes) {
            const cooldownMs = rule.cooldownMinutes * 60 * 1000;
            if (Date.now() - lastAlert.getTime() < cooldownMs) {
                return null;
            }
        }

        const now = new Date();
        this.lastAlertTime.set(cooldownKey, now);

        return {
            id: crypto.randomUUID(),
            ruleId: rule.id,
            ruleName: rule.name,
            engagementId: transaction.engagementId,
            transactionId: transaction.id,
            category: rule.category,
            severity: rule.severity,
            title: rule.name,
            message: `${rule.description}. Transaction: ${transaction.description}, Amount: ${transaction.amount}`,
            triggeredValue: transaction.amount,
            thresholdValue: rule.thresholds?.warning,
            triggeredAt: now,
            status: 'active',
        };
    }

    private createAnomalyAlert(transaction: Transaction, zScore: number): MonitoringAlert {
        return {
            id: crypto.randomUUID(),
            ruleId: 'anomaly-detection',
            ruleName: 'Statistical Anomaly Detected',
            engagementId: transaction.engagementId,
            transactionId: transaction.id,
            category: 'anomaly',
            severity: zScore > 3 ? 'critical' : 'warning',
            title: 'Unusual Transaction Amount',
            message: `Transaction amount ${transaction.amount} is ${zScore.toFixed(1)} standard deviations from the mean.`,
            triggeredValue: transaction.amount,
            anomalyScore: zScore,
            triggeredAt: new Date(),
            status: 'active',
        };
    }

    private storeAlert(engagementId: string, alert: MonitoringAlert): void {
        const alerts = this.alerts.get(engagementId) ?? [];
        alerts.push(alert);
        this.alerts.set(engagementId, alerts);
    }

    private updateMaterialityRules(threshold: number): void {
        const largeTransactionRule = this.rules.find(r => r.id === 'rule-001');
        if (largeTransactionRule) {
            largeTransactionRule.conditions[0].value = threshold;
        }
    }

    private calculateAnomalyTrend(transactions: Transaction[]): { date: string; count: number }[] {
        const byDate = new Map<string, number>();

        for (const t of transactions) {
            const dateKey = t.date.toISOString().split('T')[0];
            byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);
        }

        // Simplified - in production would calculate actual anomalies per day
        return Array.from(byDate.entries())
            .map(([date, count]) => ({ date, count: Math.floor(count * 0.02) }))  // ~2% anomaly rate
            .sort((a, b) => a.date.localeCompare(b.date));
    }
}

// Export factory function
export function createContinuousMonitoringAgent(config: ContinuousMonitoringConfig): ContinuousMonitoringAgent {
    return new ContinuousMonitoringAgent(config);
}
