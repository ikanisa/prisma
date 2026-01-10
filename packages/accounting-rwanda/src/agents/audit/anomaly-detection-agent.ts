/**
 * Rwanda Anomaly Detection Agent
 * 
 * Statistical and ML-based anomaly detection for audit and fraud identification.
 * Implements ISA 240 (Fraud) and ISA 520 (Analytical Procedures).
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    RwandaAccountingAgent,
    AgentType,
    AutonomyLevel,
    AgentContext,
    AgentResponse,
} from '../../core/base-agent.js';
import type {
    RwandaAccountingFramework,
    AuditAnomaly,
    ISAStandard,
    TransactionInput,
} from '../../types/index.js';

// ============================================================================
// ANOMALY TYPES
// ============================================================================

/**
 * Anomaly detection input.
 */
export interface AnomalyDetectionInput {
    transactions: TransactionInput[];
    periodStart: Date;
    periodEnd: Date;
    comparisonPeriod?: {
        start: Date;
        end: Date;
        transactions: TransactionInput[];
    };
    ebmInvoices?: Array<{ invoiceNumber: string; amount: number; date: Date }>;
    rssbContributions?: Array<{ period: Date; amount: number; employees: number }>;
}

/**
 * Statistical thresholds.
 */
interface StatisticalThresholds {
    zScoreThreshold: number;
    iqrMultiplier: number;
    percentileThreshold: number;
}

/**
 * Anomaly detection result.
 */
export interface AnomalyDetectionResult {
    totalTransactions: number;
    anomaliesDetected: number;
    riskScore: number;  // 0-100
    pointAnomalies: AuditAnomaly[];
    contextualAnomalies: AuditAnomaly[];
    collectiveAnomalies: AuditAnomaly[];
    rwandaSpecificAnomalies: AuditAnomaly[];
    recommendations: string[];
}

// ============================================================================
// ANOMALY DETECTION AGENT
// ============================================================================

/**
 * Rwanda Anomaly Detection Agent.
 * 
 * Detects statistical outliers, patterns, and Rwanda-specific compliance issues.
 */
export class AnomalyDetectionAgent implements RwandaAccountingAgent {
    private static instance_: AnomalyDetectionAgent | null = null;

    readonly agentId = 'rwanda-anomaly-detection-agent';
    readonly name = 'Rwanda Anomaly Detection Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'AUDIT';
    readonly capabilities = [
        'Point anomaly detection (statistical outliers)',
        'Contextual anomaly detection (unusual patterns)',
        'Collective anomaly detection (fraud schemes)',
        'Rwanda-specific checks (VAT, EBM, RSSB)',
        'Benford Law analysis',
        'Ratio analysis',
        'Trend analysis',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 3;
    readonly supportedCurrencies = ['RWF', 'USD', 'EUR', 'KES'];

    private thresholds: StatisticalThresholds;

    private constructor() {
        this.thresholds = {
            zScoreThreshold: 3.0,      // 3 standard deviations
            iqrMultiplier: 1.5,        // 1.5 * IQR for outliers
            percentileThreshold: 99,   // 99th percentile
        };
    }

    /**
     * Get singleton instance.
     */
    static instance(): AnomalyDetectionAgent {
        if (!AnomalyDetectionAgent.instance_) {
            AnomalyDetectionAgent.instance_ = new AnomalyDetectionAgent();
        }
        return AnomalyDetectionAgent.instance_;
    }

    /**
     * Perform comprehensive anomaly detection.
     */
    async detectAnomalies(
        input: AnomalyDetectionInput,
        context: AgentContext
    ): Promise<AgentResponse<AnomalyDetectionResult>> {
        const startTime = Date.now();

        try {
            // 1. Detect point anomalies (statistical outliers)
            const pointAnomalies = this.detectPointAnomalies(input.transactions);

            // 2. Detect contextual anomalies (unusual patterns)
            const contextualAnomalies = this.detectContextualAnomalies(
                input.transactions,
                input.comparisonPeriod?.transactions
            );

            // 3. Detect collective anomalies (fraud patterns)
            const collectiveAnomalies = this.detectCollectiveAnomalies(input.transactions);

            // 4. Rwanda-specific checks
            const rwandaAnomalies = await this.detectRwandaAnomalies(input, context);

            // Calculate overall risk score
            const allAnomalies = [
                ...pointAnomalies,
                ...contextualAnomalies,
                ...collectiveAnomalies,
                ...rwandaAnomalies,
            ];
            const riskScore = this.calculateRiskScore(allAnomalies, input.transactions.length);

            // Generate recommendations
            const recommendations = this.generateRecommendations(allAnomalies);

            const result: AnomalyDetectionResult = {
                totalTransactions: input.transactions.length,
                anomaliesDetected: allAnomalies.length,
                riskScore,
                pointAnomalies,
                contextualAnomalies,
                collectiveAnomalies,
                rwandaSpecificAnomalies: rwandaAnomalies,
                recommendations,
            };

            return {
                success: true,
                data: result,
                confidenceScore: 0.88,
                requiresReview: riskScore > 50 || allAnomalies.some(a => a.severity === 'CRITICAL'),
                reviewReason: riskScore > 50 ? 'High overall risk score' : undefined,
                isaStandard: 'ISA 520',
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Anomaly detection failed',
                requiresReview: true,
                reviewReason: 'Detection error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Detect point anomalies using Z-score and IQR methods.
     */
    detectPointAnomalies(transactions: TransactionInput[]): AuditAnomaly[] {
        const anomalies: AuditAnomaly[] = [];
        const amounts = transactions.map(tx => tx.amount);

        // Calculate statistics
        const mean = this.mean(amounts);
        const stdDev = this.stdDev(amounts);
        const { q1, q3 } = this.quartiles(amounts);
        const iqr = q3 - q1;

        for (const tx of transactions) {
            // Z-score method
            const zScore = stdDev > 0 ? (tx.amount - mean) / stdDev : 0;
            if (Math.abs(zScore) > this.thresholds.zScoreThreshold) {
                anomalies.push({
                    id: `pa-${tx.id}`,
                    type: 'POINT',
                    severity: Math.abs(zScore) > 5 ? 'HIGH' : 'MEDIUM',
                    transactionId: tx.id,
                    description: `Transaction amount RWF ${tx.amount.toLocaleString()} is ${zScore.toFixed(2)} standard deviations from mean`,
                    isaReference: 'ISA_520',
                    confidence: Math.min(0.99, 0.7 + Math.abs(zScore) * 0.05),
                    investigated: false,
                });
            }

            // IQR method (catches different outliers)
            const lowerBound = q1 - this.thresholds.iqrMultiplier * iqr;
            const upperBound = q3 + this.thresholds.iqrMultiplier * iqr;
            if (tx.amount < lowerBound || tx.amount > upperBound) {
                // Avoid duplicates
                if (!anomalies.find(a => a.transactionId === tx.id)) {
                    anomalies.push({
                        id: `pa-iqr-${tx.id}`,
                        type: 'POINT',
                        severity: 'LOW',
                        transactionId: tx.id,
                        description: `Transaction amount outside IQR bounds (${lowerBound.toFixed(0)} - ${upperBound.toFixed(0)})`,
                        isaReference: 'ISA_520',
                        confidence: 0.75,
                        investigated: false,
                    });
                }
            }
        }

        return anomalies;
    }

    /**
     * Detect contextual anomalies (unusual patterns in context).
     */
    detectContextualAnomalies(
        currentPeriod: TransactionInput[],
        priorPeriod?: TransactionInput[]
    ): AuditAnomaly[] {
        const anomalies: AuditAnomaly[] = [];

        // 1. Weekend/holiday transactions
        const weekendTxs = currentPeriod.filter(tx => {
            const day = tx.date.getDay();
            return day === 0 || day === 6; // Sunday or Saturday
        });
        if (weekendTxs.length > currentPeriod.length * 0.1) {
            anomalies.push({
                id: 'ca-weekend-high',
                type: 'CONTEXTUAL',
                severity: 'MEDIUM',
                description: `${weekendTxs.length} transactions (${((weekendTxs.length / currentPeriod.length) * 100).toFixed(1)}%) on weekends - unusual pattern`,
                isaReference: 'ISA_240',
                confidence: 0.80,
                investigated: false,
            });
        }

        // 2. Month-end clustering
        const monthEndTxs = currentPeriod.filter(tx => {
            const day = tx.date.getDate();
            const lastDay = new Date(tx.date.getFullYear(), tx.date.getMonth() + 1, 0).getDate();
            return day >= lastDay - 2;
        });
        if (monthEndTxs.length > currentPeriod.length * 0.3) {
            anomalies.push({
                id: 'ca-monthend-cluster',
                type: 'CONTEXTUAL',
                severity: 'MEDIUM',
                description: 'High concentration of transactions at month-end - possible window dressing',
                isaReference: 'ISA_240',
                confidence: 0.75,
                investigated: false,
            });
        }

        // 3. Year-over-year variance (if prior period available)
        if (priorPeriod && priorPeriod.length > 0) {
            const currentTotal = this.sum(currentPeriod.map(tx => tx.amount));
            const priorTotal = this.sum(priorPeriod.map(tx => tx.amount));
            const variance = priorTotal > 0
                ? ((currentTotal - priorTotal) / priorTotal) * 100
                : 0;

            if (Math.abs(variance) > 30) {
                anomalies.push({
                    id: 'ca-yoy-variance',
                    type: 'CONTEXTUAL',
                    severity: Math.abs(variance) > 50 ? 'HIGH' : 'MEDIUM',
                    description: `Year-over-year variance of ${variance.toFixed(1)}% - investigate unusual fluctuation`,
                    isaReference: 'ISA_520',
                    confidence: 0.85,
                    investigated: false,
                });
            }
        }

        // 4. Benford's Law analysis (first digit distribution)
        const benfordAnomaly = this.checkBenfordLaw(currentPeriod);
        if (benfordAnomaly) {
            anomalies.push(benfordAnomaly);
        }

        return anomalies;
    }

    /**
     * Detect collective anomalies (fraud patterns across transactions).
     */
    detectCollectiveAnomalies(transactions: TransactionInput[]): AuditAnomaly[] {
        const anomalies: AuditAnomaly[] = [];

        // 1. Round number transactions (potential manipulation)
        const roundNumbers = transactions.filter(tx => tx.amount % 1000 === 0 && tx.amount >= 100000);
        if (roundNumbers.length > transactions.length * 0.4) {
            anomalies.push({
                id: 'coll-round-numbers',
                type: 'COLLECTIVE',
                severity: 'MEDIUM',
                description: `${roundNumbers.length} transactions with round numbers - potential estimation or manipulation`,
                isaReference: 'ISA_240',
                confidence: 0.70,
                investigated: false,
            });
        }

        // 2. Just-below-threshold transactions
        const thresholds = [100000, 500000, 1000000, 5000000, 10000000]; // Common approval thresholds
        for (const threshold of thresholds) {
            const justBelow = transactions.filter(tx =>
                tx.amount >= threshold * 0.95 && tx.amount < threshold
            );
            if (justBelow.length >= 3) {
                anomalies.push({
                    id: `coll-threshold-${threshold}`,
                    type: 'COLLECTIVE',
                    severity: 'HIGH',
                    description: `${justBelow.length} transactions just below RWF ${threshold.toLocaleString()} - possible threshold avoidance`,
                    isaReference: 'ISA_240',
                    confidence: 0.85,
                    investigated: false,
                });
            }
        }

        // 3. Duplicate amounts on same day (potential posting errors or fraud)
        const byDate = new Map<string, number[]>();
        for (const tx of transactions) {
            const dateKey = tx.date.toISOString().split('T')[0];
            const existing = byDate.get(dateKey) || [];
            existing.push(tx.amount);
            byDate.set(dateKey, existing);
        }

        for (const [date, amounts] of byDate) {
            const duplicates = amounts.filter((amt, i) => amounts.indexOf(amt) !== i);
            if (duplicates.length >= 2) {
                anomalies.push({
                    id: `coll-dup-${date}`,
                    type: 'COLLECTIVE',
                    severity: 'MEDIUM',
                    description: `Multiple identical amounts on ${date} - verify for posting errors`,
                    isaReference: 'ISA_500',
                    confidence: 0.75,
                    investigated: false,
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect Rwanda-specific anomalies.
     */
    async detectRwandaAnomalies(
        input: AnomalyDetectionInput,
        context: AgentContext
    ): Promise<AuditAnomaly[]> {
        const anomalies: AuditAnomaly[] = [];

        // 1. VAT compliance checks
        const vatIssues = this.checkVATCompliance(input.transactions, context);
        anomalies.push(...vatIssues);

        // 2. EBM invoice sequence gaps
        if (input.ebmInvoices) {
            const ebmGaps = this.checkEBMSequence(input.ebmInvoices);
            anomalies.push(...ebmGaps);
        }

        // 3. RSSB contribution anomalies
        if (input.rssbContributions) {
            const rssbIssues = this.checkRSSBContributions(input.rssbContributions);
            anomalies.push(...rssbIssues);
        }

        // 4. Export documentation check
        const exportIssues = this.checkExportDocumentation(input.transactions);
        anomalies.push(...exportIssues);

        return anomalies;
    }

    /**
     * Check VAT compliance.
     */
    private checkVATCompliance(
        transactions: TransactionInput[],
        context: AgentContext
    ): AuditAnomaly[] {
        const anomalies: AuditAnomaly[] = [];

        // Check for sales without EBM invoices
        const salesWithoutEBM = transactions.filter(tx =>
            tx.type === 'INCOME' &&
            tx.amount > 100000 &&
            !tx.ebmInvoiceNumber &&
            context.isVATRegistered
        );

        if (salesWithoutEBM.length > 0) {
            anomalies.push({
                id: 'rw-vat-no-ebm',
                type: 'RWANDA_SPECIFIC',
                severity: 'HIGH',
                description: `${salesWithoutEBM.length} sales transactions without EBM invoice numbers - RRA compliance risk`,
                isaReference: 'ISA_250',
                rraImplication: 'Missing EBM can result in penalties and VAT disallowance',
                confidence: 0.95,
                investigated: false,
            });
        }

        return anomalies;
    }

    /**
     * Check EBM invoice sequence for gaps.
     */
    private checkEBMSequence(
        invoices: Array<{ invoiceNumber: string; amount: number; date: Date }>
    ): AuditAnomaly[] {
        const anomalies: AuditAnomaly[] = [];

        // Sort by invoice number
        const sorted = [...invoices].sort((a, b) =>
            a.invoiceNumber.localeCompare(b.invoiceNumber)
        );

        // Check for gaps
        let gaps = 0;
        for (let i = 1; i < sorted.length; i++) {
            const prevNum = this.extractNumber(sorted[i - 1].invoiceNumber);
            const currNum = this.extractNumber(sorted[i].invoiceNumber);
            if (prevNum !== null && currNum !== null && currNum - prevNum > 1) {
                gaps++;
            }
        }

        if (gaps > 0) {
            anomalies.push({
                id: 'rw-ebm-gaps',
                type: 'RWANDA_SPECIFIC',
                severity: 'CRITICAL',
                description: `${gaps} gaps in EBM invoice sequence - possible missing/voided invoices`,
                isaReference: 'ISA_500',
                rraImplication: 'RRA may investigate missing invoice numbers during audit',
                confidence: 0.95,
                investigated: false,
            });
        }

        return anomalies;
    }

    /**
     * Check RSSB contribution patterns.
     */
    private checkRSSBContributions(
        contributions: Array<{ period: Date; amount: number; employees: number }>
    ): AuditAnomaly[] {
        const anomalies: AuditAnomaly[] = [];

        // Check for significant variance in contributions
        const amounts = contributions.map(c => c.amount);
        const mean = this.mean(amounts);
        const stdDev = this.stdDev(amounts);

        for (const contrib of contributions) {
            const zScore = stdDev > 0 ? (contrib.amount - mean) / stdDev : 0;
            if (Math.abs(zScore) > 2) {
                anomalies.push({
                    id: `rw-rssb-${contrib.period.toISOString().slice(0, 7)}`,
                    type: 'RWANDA_SPECIFIC',
                    severity: 'MEDIUM',
                    description: `RSSB contribution for ${contrib.period.toISOString().slice(0, 7)} varies significantly from average`,
                    isaReference: 'ISA_520',
                    rraImplication: 'May indicate payroll changes or calculation errors',
                    confidence: 0.80,
                    investigated: false,
                });
            }
        }

        return anomalies;
    }

    /**
     * Check export documentation.
     */
    private checkExportDocumentation(transactions: TransactionInput[]): AuditAnomaly[] {
        const anomalies: AuditAnomaly[] = [];

        const exports = transactions.filter(tx => tx.isExport || tx.isEACSupply || tx.isAfCFTASupply);
        const withoutCert = exports.filter(tx =>
            (tx.isEACSupply || tx.isAfCFTASupply) && !tx.metadata?.originCertificate
        );

        if (withoutCert.length > 0) {
            anomalies.push({
                id: 'rw-export-no-cert',
                type: 'RWANDA_SPECIFIC',
                severity: 'HIGH',
                description: `${withoutCert.length} EAC/AfCFTA exports without origin certificates - VAT zero-rating at risk`,
                isaReference: 'ISA_500',
                rraImplication: 'Zero-rating may be disallowed without valid origin certificates',
                confidence: 0.90,
                investigated: false,
            });
        }

        return anomalies;
    }

    /**
     * Check Benford's Law compliance.
     */
    private checkBenfordLaw(transactions: TransactionInput[]): AuditAnomaly | null {
        const firstDigits = transactions
            .filter(tx => tx.amount >= 10)
            .map(tx => parseInt(String(tx.amount).charAt(0), 10));

        const distribution = new Array(10).fill(0);
        firstDigits.forEach(d => distribution[d]++);
        const total = firstDigits.length;

        // Benford expected distribution
        const expected = [0, 30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];

        // Chi-square test
        let chiSquare = 0;
        for (let i = 1; i <= 9; i++) {
            const observed = (distribution[i] / total) * 100;
            const exp = expected[i];
            chiSquare += Math.pow(observed - exp, 2) / exp;
        }

        // High chi-square indicates deviation from Benford's Law
        if (chiSquare > 20) { // Significant at p<0.01
            return {
                id: 'ca-benford',
                type: 'CONTEXTUAL',
                severity: chiSquare > 40 ? 'HIGH' : 'MEDIUM',
                description: `First-digit distribution deviates from Benford's Law (χ² = ${chiSquare.toFixed(2)}) - possible manipulation`,
                isaReference: 'ISA_240',
                confidence: Math.min(0.95, 0.6 + chiSquare * 0.01),
                investigated: false,
            };
        }

        return null;
    }

    /**
     * Calculate overall risk score.
     */
    private calculateRiskScore(anomalies: AuditAnomaly[], totalTxs: number): number {
        if (anomalies.length === 0) return 0;

        const severityWeights = { LOW: 1, MEDIUM: 3, HIGH: 5, CRITICAL: 10 };
        let totalWeight = 0;

        for (const a of anomalies) {
            totalWeight += severityWeights[a.severity] * a.confidence;
        }

        // Scale to 0-100
        const maxPossible = totalTxs * 10; // If every tx was CRITICAL
        return Math.min(100, (totalWeight / Math.max(1, maxPossible)) * 100 * 50);
    }

    /**
     * Generate recommendations based on anomalies.
     */
    private generateRecommendations(anomalies: AuditAnomaly[]): string[] {
        const recommendations: string[] = [];

        // Count severity
        const critical = anomalies.filter(a => a.severity === 'CRITICAL').length;
        const high = anomalies.filter(a => a.severity === 'HIGH').length;
        const rwandaSpecific = anomalies.filter(a => a.type === 'RWANDA_SPECIFIC').length;

        if (critical > 0) {
            recommendations.push('Immediately investigate critical anomalies before proceeding');
        }

        if (high >= 3) {
            recommendations.push('Consider expanding sample size for substantive testing');
        }

        if (rwandaSpecific >= 2) {
            recommendations.push('Engage RRA compliance specialist for Rwanda-specific issues');
        }

        if (anomalies.some(a => a.isaReference === 'ISA_240')) {
            recommendations.push('Document fraud risk response per ISA 240 requirements');
        }

        if (anomalies.some(a => a.description.includes('EBM'))) {
            recommendations.push('Request EBM audit trail from client and reconcile to ISHEMA');
        }

        // Default if no specific recommendations
        if (recommendations.length === 0 && anomalies.length > 0) {
            recommendations.push('Document resolution of identified anomalies in working papers');
        }

        return recommendations;
    }

    // =========================================================================
    // STATISTICAL HELPERS
    // =========================================================================

    private mean(values: number[]): number {
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    private stdDev(values: number[]): number {
        const avg = this.mean(values);
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(this.mean(squareDiffs));
    }

    private quartiles(values: number[]): { q1: number; q3: number } {
        const sorted = [...values].sort((a, b) => a - b);
        const q1Index = Math.floor(sorted.length * 0.25);
        const q3Index = Math.floor(sorted.length * 0.75);
        return {
            q1: sorted[q1Index] || 0,
            q3: sorted[q3Index] || 0,
        };
    }

    private sum(values: number[]): number {
        return values.reduce((a, b) => a + b, 0);
    }

    private extractNumber(str: string): number | null {
        const match = str.match(/\d+$/);
        return match ? parseInt(match[0], 10) : null;
    }
}

/**
 * Factory function.
 */
export function createAnomalyDetectionAgent(): AnomalyDetectionAgent {
    return AnomalyDetectionAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const anomalyDetectionAgent = {
    instance: () => AnomalyDetectionAgent.instance(),
};
