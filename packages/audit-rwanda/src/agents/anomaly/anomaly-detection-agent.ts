/**
 * Rwanda Anomaly Detection Agent
 * 
 * Statistical and ML-based anomaly detection for audit and fraud identification.
 * Implements ISA 240 (Fraud) and ISA 520 (Analytical Procedures).
 * 
 * @package @prisma/audit-rwanda
 */

import { RiskLevel } from '../../types/index.js';

import type {
    RwandaAuditAgent,
    AgentConfig,
    Anomaly,
    BenfordsAnalysis,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface TransactionForAnalysis {
    id: string;
    amount: number;
    date: Date;
    type: 'INCOME' | 'EXPENSE';
    description?: string;
    ebmInvoiceNumber?: string;
    isExport?: boolean;
    isEACSupply?: boolean;
    isAfCFTASupply?: boolean;
}

export interface AnomalyDetectionInput {
    transactions: TransactionForAnalysis[];
    periodStart: Date;
    periodEnd: Date;
    comparisonPeriod?: {
        start: Date;
        end: Date;
        transactions: TransactionForAnalysis[];
    };
    ebmInvoices?: Array<{ invoiceNumber: string; amount: number; date: Date }>;
    rssbContributions?: Array<{ period: Date; amount: number; employees: number }>;
    isVATRegistered?: boolean;
}

export interface AnomalyDetectionResult {
    totalTransactions: number;
    anomaliesDetected: number;
    riskScore: number;
    pointAnomalies: Anomaly[];
    contextualAnomalies: Anomaly[];
    collectiveAnomalies: Anomaly[];
    rwandaSpecificAnomalies: Anomaly[];
    benfordsAnalysis?: BenfordsAnalysis;
    recommendations: string[];
}

// ============================================================================
// ANOMALY DETECTION AGENT
// ============================================================================

export class RwandaAnomalyDetectionAgent implements RwandaAuditAgent {
    public readonly name = 'Rwanda Anomaly Detection Agent';
    public readonly version = '1.0.0';
    public readonly category = 'audit' as const;
    public readonly jurisdiction = 'RW' as const;

    private zScoreThreshold = 3.0;
    private iqrMultiplier = 1.5;

    constructor(_config: AgentConfig = {}) { }

    getCapabilities(): string[] {
        return [
            'Point anomaly detection (Z-score, IQR)',
            'Contextual anomaly detection (patterns)',
            'Collective anomaly detection (fraud schemes)',
            'Rwanda-specific checks (VAT, EBM, RSSB)',
            'Benford\'s Law analysis',
            'Ratio and trend analysis',
            'ISA 240 fraud risk procedures',
        ];
    }

    /**
     * Perform comprehensive anomaly detection.
     */
    detectAnomalies(input: AnomalyDetectionInput): AnomalyDetectionResult {
        // Point anomalies (statistical outliers)
        const pointAnomalies = this.detectPointAnomalies(input.transactions);

        // Contextual anomalies (unusual patterns)
        const contextualAnomalies = this.detectContextualAnomalies(
            input.transactions,
            input.comparisonPeriod?.transactions
        );

        // Collective anomalies (fraud patterns)
        const collectiveAnomalies = this.detectCollectiveAnomalies(input.transactions);

        // Rwanda-specific checks
        const rwandaSpecificAnomalies = this.detectRwandaAnomalies(input);

        // Benford's Law analysis
        const benfordsAnalysis = this.performBenfordAnalysis(input.transactions);

        // All anomalies
        const allAnomalies = [
            ...pointAnomalies,
            ...contextualAnomalies,
            ...collectiveAnomalies,
            ...rwandaSpecificAnomalies,
        ];

        // Risk score
        const riskScore = this.calculateRiskScore(allAnomalies, input.transactions.length);

        // Recommendations
        const recommendations = this.generateRecommendations(allAnomalies);

        return {
            totalTransactions: input.transactions.length,
            anomaliesDetected: allAnomalies.length,
            riskScore,
            pointAnomalies,
            contextualAnomalies,
            collectiveAnomalies,
            rwandaSpecificAnomalies,
            benfordsAnalysis,
            recommendations,
        };
    }

    /**
     * Detect point anomalies using Z-score and IQR methods.
     */
    private detectPointAnomalies(transactions: TransactionForAnalysis[]): Anomaly[] {
        const anomalies: Anomaly[] = [];
        const amounts = transactions.map(tx => tx.amount);

        const mean = this.mean(amounts);
        const stdDev = this.stdDev(amounts);
        const { q1, q3 } = this.quartiles(amounts);
        const iqr = q3 - q1;

        let anomalyCount = 0;

        for (const tx of transactions) {
            const zScore = stdDev > 0 ? (tx.amount - mean) / stdDev : 0;

            if (Math.abs(zScore) > this.zScoreThreshold) {
                anomalyCount++;
                anomalies.push({
                    anomalyId: `pa-${tx.id}`,
                    type: 'statistical',
                    description: `Transaction RWF ${tx.amount.toLocaleString()} is ${zScore.toFixed(2)} std devs from mean`,
                    severity: Math.abs(zScore) > 5 ? RiskLevel.HIGH : RiskLevel.MODERATE,
                    affectedRecords: 1,
                    totalValue: tx.amount,
                    confidence: Math.min(0.99, 0.7 + Math.abs(zScore) * 0.05),
                    investigated: false,
                });
            }

            // IQR method
            const lowerBound = q1 - this.iqrMultiplier * iqr;
            const upperBound = q3 + this.iqrMultiplier * iqr;
            if ((tx.amount < lowerBound || tx.amount > upperBound) &&
                !anomalies.find(a => a.anomalyId === `pa-${tx.id}`)) {
                anomalyCount++;
                anomalies.push({
                    anomalyId: `pa-iqr-${tx.id}`,
                    type: 'statistical',
                    description: `Transaction outside IQR bounds (${lowerBound.toFixed(0)} - ${upperBound.toFixed(0)})`,
                    severity: RiskLevel.LOW,
                    affectedRecords: 1,
                    totalValue: tx.amount,
                    confidence: 0.75,
                    investigated: false,
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect contextual anomalies.
     */
    private detectContextualAnomalies(
        currentPeriod: TransactionForAnalysis[],
        priorPeriod?: TransactionForAnalysis[]
    ): Anomaly[] {
        const anomalies: Anomaly[] = [];

        // Weekend transactions
        const weekendTxs = currentPeriod.filter(tx => {
            const day = tx.date.getDay();
            return day === 0 || day === 6;
        });
        if (weekendTxs.length > currentPeriod.length * 0.1) {
            anomalies.push({
                anomalyId: 'ca-weekend',
                type: 'pattern',
                description: `${weekendTxs.length} transactions (${((weekendTxs.length / currentPeriod.length) * 100).toFixed(1)}%) on weekends`,
                severity: RiskLevel.MODERATE,
                affectedRecords: weekendTxs.length,
                totalValue: weekendTxs.reduce((sum, tx) => sum + tx.amount, 0),
                confidence: 0.80,
                investigated: false,
            });
        }

        // Month-end clustering
        const monthEndTxs = currentPeriod.filter(tx => {
            const day = tx.date.getDate();
            const lastDay = new Date(tx.date.getFullYear(), tx.date.getMonth() + 1, 0).getDate();
            return day >= lastDay - 2;
        });
        if (monthEndTxs.length > currentPeriod.length * 0.3) {
            anomalies.push({
                anomalyId: 'ca-monthend',
                type: 'pattern',
                description: 'High concentration at month-end - possible window dressing',
                severity: RiskLevel.MODERATE,
                affectedRecords: monthEndTxs.length,
                totalValue: monthEndTxs.reduce((sum, tx) => sum + tx.amount, 0),
                confidence: 0.75,
                investigated: false,
            });
        }

        // Year-over-year variance
        if (priorPeriod && priorPeriod.length > 0) {
            const currentTotal = this.sum(currentPeriod.map(tx => tx.amount));
            const priorTotal = this.sum(priorPeriod.map(tx => tx.amount));
            const variance = priorTotal > 0
                ? ((currentTotal - priorTotal) / priorTotal) * 100
                : 0;

            if (Math.abs(variance) > 30) {
                anomalies.push({
                    anomalyId: 'ca-yoy',
                    type: 'pattern',
                    description: `YoY variance of ${variance.toFixed(1)}% - investigate fluctuation`,
                    severity: Math.abs(variance) > 50 ? RiskLevel.HIGH : RiskLevel.MODERATE,
                    affectedRecords: currentPeriod.length,
                    totalValue: Math.abs(currentTotal - priorTotal),
                    confidence: 0.85,
                    investigated: false,
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect collective anomalies (fraud patterns).
     */
    private detectCollectiveAnomalies(transactions: TransactionForAnalysis[]): Anomaly[] {
        const anomalies: Anomaly[] = [];

        // Round number transactions
        const roundNumbers = transactions.filter(tx => tx.amount % 1000 === 0 && tx.amount >= 100000);
        if (roundNumbers.length > transactions.length * 0.4) {
            anomalies.push({
                anomalyId: 'coll-round',
                type: 'pattern',
                description: `${roundNumbers.length} transactions with round numbers - potential estimation`,
                severity: RiskLevel.MODERATE,
                affectedRecords: roundNumbers.length,
                totalValue: roundNumbers.reduce((sum, tx) => sum + tx.amount, 0),
                confidence: 0.70,
                investigated: false,
            });
        }

        // Just-below-threshold transactions
        const thresholds = [100000, 500000, 1000000, 5000000, 10000000];
        for (const threshold of thresholds) {
            const justBelow = transactions.filter(tx =>
                tx.amount >= threshold * 0.95 && tx.amount < threshold
            );
            if (justBelow.length >= 3) {
                anomalies.push({
                    anomalyId: `coll-threshold-${threshold}`,
                    type: 'pattern',
                    description: `${justBelow.length} transactions just below RWF ${threshold.toLocaleString()} - threshold avoidance?`,
                    severity: RiskLevel.HIGH,
                    affectedRecords: justBelow.length,
                    totalValue: justBelow.reduce((sum, tx) => sum + tx.amount, 0),
                    confidence: 0.85,
                    investigated: false,
                });
            }
        }

        // Duplicate amounts on same day
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
                    anomalyId: `coll-dup-${date}`,
                    type: 'duplicate',
                    description: `Multiple identical amounts on ${date} - verify for errors`,
                    severity: RiskLevel.MODERATE,
                    affectedRecords: duplicates.length + 1,
                    totalValue: duplicates.reduce((sum, amt) => sum + amt, 0),
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
    private detectRwandaAnomalies(input: AnomalyDetectionInput): Anomaly[] {
        const anomalies: Anomaly[] = [];

        // Sales without EBM
        if (input.isVATRegistered) {
            const salesWithoutEBM = input.transactions.filter(tx =>
                tx.type === 'INCOME' &&
                tx.amount > 100000 &&
                !tx.ebmInvoiceNumber
            );
            if (salesWithoutEBM.length > 0) {
                anomalies.push({
                    anomalyId: 'rw-no-ebm',
                    type: 'pattern',
                    description: `${salesWithoutEBM.length} sales without EBM invoice - RRA compliance risk`,
                    severity: RiskLevel.HIGH,
                    affectedRecords: salesWithoutEBM.length,
                    totalValue: salesWithoutEBM.reduce((sum, tx) => sum + tx.amount, 0),
                    confidence: 0.95,
                    investigated: false,
                });
            }
        }

        // EBM sequence gaps
        if (input.ebmInvoices) {
            const sorted = [...input.ebmInvoices].sort((a, b) =>
                a.invoiceNumber.localeCompare(b.invoiceNumber)
            );
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
                    anomalyId: 'rw-ebm-gaps',
                    type: 'pattern',
                    description: `${gaps} gaps in EBM sequence - missing/voided invoices`,
                    severity: RiskLevel.CRITICAL,
                    affectedRecords: gaps,
                    totalValue: 0,
                    confidence: 0.95,
                    investigated: false,
                });
            }
        }

        // RSSB contribution variance
        if (input.rssbContributions && input.rssbContributions.length > 2) {
            const amounts = input.rssbContributions.map(c => c.amount);
            const mean = this.mean(amounts);
            const stdDev = this.stdDev(amounts);

            for (const contrib of input.rssbContributions) {
                const zScore = stdDev > 0 ? (contrib.amount - mean) / stdDev : 0;
                if (Math.abs(zScore) > 2) {
                    anomalies.push({
                        anomalyId: `rw-rssb-${contrib.period.toISOString().slice(0, 7)}`,
                        type: 'statistical',
                        description: `RSSB for ${contrib.period.toISOString().slice(0, 7)} varies significantly`,
                        severity: RiskLevel.MODERATE,
                        affectedRecords: 1,
                        totalValue: contrib.amount,
                        confidence: 0.80,
                        investigated: false,
                    });
                }
            }
        }

        return anomalies;
    }

    /**
     * Perform Benford's Law analysis.
     */
    private performBenfordAnalysis(transactions: TransactionForAnalysis[]): BenfordsAnalysis {
        const firstDigits = transactions
            .filter(tx => tx.amount >= 10)
            .map(tx => parseInt(String(Math.abs(tx.amount)).charAt(0), 10));

        const distribution: Record<string, number> = {};
        for (let i = 1; i <= 9; i++) {
            distribution[String(i)] = 0;
        }
        firstDigits.forEach(d => {
            if (d >= 1 && d <= 9) distribution[String(d)]++;
        });

        const total = firstDigits.length;
        for (const key of Object.keys(distribution)) {
            distribution[key] = total > 0 ? (distribution[key] / total) * 100 : 0;
        }

        const expected: Record<string, number> = {
            '1': 30.1, '2': 17.6, '3': 12.5, '4': 9.7, '5': 7.9,
            '6': 6.7, '7': 5.8, '8': 5.1, '9': 4.6,
        };

        // Chi-square
        let chiSquare = 0;
        for (let i = 1; i <= 9; i++) {
            const obs = distribution[String(i)];
            const exp = expected[String(i)];
            chiSquare += Math.pow(obs - exp, 2) / exp;
        }

        // p-value approximation (chi-square with 8 df)
        const pValue = chiSquare > 15.51 ? 0.05 : chiSquare > 20.09 ? 0.01 : 0.10;

        return {
            firstDigitDistribution: distribution,
            expectedDistribution: expected,
            chiSquareStatistic: Math.round(chiSquare * 100) / 100,
            pValue,
            conformsToLaw: chiSquare <= 15.51,
        };
    }

    /**
     * Calculate overall risk score (0-100).
     */
    private calculateRiskScore(anomalies: Anomaly[], totalTxs: number): number {
        if (anomalies.length === 0) return 0;

        const weights: Record<RiskLevel, number> = {
            [RiskLevel.LOW]: 1,
            [RiskLevel.MODERATE]: 3,
            [RiskLevel.HIGH]: 5,
            [RiskLevel.CRITICAL]: 10,
        };

        let totalWeight = 0;
        for (const a of anomalies) {
            totalWeight += weights[a.severity] * a.confidence;
        }

        const maxPossible = totalTxs * 10;
        return Math.min(100, Math.round((totalWeight / Math.max(1, maxPossible)) * 100 * 50));
    }

    /**
     * Generate recommendations.
     */
    private generateRecommendations(anomalies: Anomaly[]): string[] {
        const recommendations: string[] = [];

        const critical = anomalies.filter(a => a.severity === RiskLevel.CRITICAL).length;
        const high = anomalies.filter(a => a.severity === RiskLevel.HIGH).length;

        if (critical > 0) {
            recommendations.push('Immediately investigate critical anomalies before proceeding');
        }

        if (high >= 3) {
            recommendations.push('Consider expanding sample size for substantive testing');
        }

        if (anomalies.some(a => a.anomalyId.startsWith('rw-'))) {
            recommendations.push('Engage RRA compliance specialist for Rwanda-specific issues');
        }

        if (anomalies.some(a => a.description.includes('EBM'))) {
            recommendations.push('Request EBM audit trail and reconcile to ISHEMA');
        }

        if (recommendations.length === 0 && anomalies.length > 0) {
            recommendations.push('Document resolution of anomalies in working papers');
        }

        return recommendations;
    }

    // Statistical helpers
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
        return {
            q1: sorted[Math.floor(sorted.length * 0.25)] || 0,
            q3: sorted[Math.floor(sorted.length * 0.75)] || 0,
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

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaAnomalyDetectionAgent(config?: AgentConfig): RwandaAnomalyDetectionAgent {
    return new RwandaAnomalyDetectionAgent(config);
}

let _anomalyAgent: RwandaAnomalyDetectionAgent | null = null;

export const rwandaAnomalyDetectionAgent = {
    instance(config?: AgentConfig): RwandaAnomalyDetectionAgent {
        if (!_anomalyAgent) {
            _anomalyAgent = new RwandaAnomalyDetectionAgent(config);
        }
        return _anomalyAgent;
    },
};
