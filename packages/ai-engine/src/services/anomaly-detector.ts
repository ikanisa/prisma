/**
 * Anomaly Detection Engine
 * 
 * MindBridge-style anomaly detection for accounting transactions.
 * Detects point anomalies (outliers), contextual anomalies (patterns),
 * and collective anomalies (fraud schemes).
 */

import {
    type NormalizedTransaction,
    type Anomaly,
    type AnomalyReport,
    type AnomalyType,
    type Severity,
} from '../types.js';

// ============================================================================
// STATISTICAL HELPERS
// ============================================================================

interface StatisticsResult {
    mean: number;
    stdDev: number;
    median: number;
    min: number;
    max: number;
    count: number;
    q1: number;
    q3: number;
    iqr: number;
}

function calculateStatistics(values: number[]): StatisticsResult {
    if (values.length === 0) {
        return { mean: 0, stdDev: 0, median: 0, min: 0, max: 0, count: 0, q1: 0, q3: 0, iqr: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];

    return {
        mean,
        stdDev,
        median,
        min: sorted[0],
        max: sorted[n - 1],
        count: n,
        q1,
        q3,
        iqr: q3 - q1,
    };
}

// ============================================================================
// PATTERN STORAGE
// ============================================================================

interface VendorPattern {
    vendorId: string;
    typicalAmounts: number[];
    typicalDayOfWeek: number[];
    typicalHours: number[];
    categoryHistory: string[];
    lastSeen: Date;
}

interface CategoryPattern {
    category: string;
    typicalAmounts: number[];
    typicalVendors: string[];
}

// ============================================================================
// ANOMALY DETECTOR
// ============================================================================

export class AnomalyDetector {
    private vendorPatterns: Map<string, VendorPattern> = new Map();
    private categoryPatterns: Map<string, CategoryPattern> = new Map();
    private zScoreThreshold: number;
    private iqrMultiplier: number;

    constructor(options: {
        zScoreThreshold?: number;
        iqrMultiplier?: number;
    } = {}) {
        this.zScoreThreshold = options.zScoreThreshold ?? 3;
        this.iqrMultiplier = options.iqrMultiplier ?? 1.5;
    }

    /**
     * Detect all types of anomalies in a set of transactions
     */
    async detectAnomalies(
        transactions: NormalizedTransaction[]
    ): Promise<AnomalyReport> {
        const pointAnomalies = await this.detectPointAnomalies(transactions);
        const contextualAnomalies = await this.detectContextualAnomalies(transactions);
        const collectiveAnomalies = await this.detectCollectiveAnomalies(transactions);

        const allAnomalies = [...pointAnomalies, ...contextualAnomalies, ...collectiveAnomalies];

        return {
            anomalies: {
                point: pointAnomalies,
                contextual: contextualAnomalies,
                collective: collectiveAnomalies,
            },
            totalCount: allAnomalies.length,
            riskScore: this.calculateOverallRiskScore(allAnomalies),
            recommendations: this.generateRecommendations(allAnomalies),
            generatedAt: new Date(),
        };
    }

    /**
     * Detect point anomalies (statistical outliers)
     */
    async detectPointAnomalies(
        transactions: NormalizedTransaction[]
    ): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];
        const amounts = transactions.map(t => t.amount);
        const stats = calculateStatistics(amounts);

        for (const tx of transactions) {
            // Z-score method
            const zScore = stats.stdDev > 0
                ? (tx.amount - stats.mean) / stats.stdDev
                : 0;

            if (Math.abs(zScore) > this.zScoreThreshold) {
                anomalies.push({
                    id: crypto.randomUUID(),
                    type: 'point',
                    transactionId: tx.id,
                    severity: this.getSeverityFromZScore(zScore),
                    riskScore: Math.min(100, Math.abs(zScore) * 20),
                    description: `Amount ${tx.amount} is ${zScore.toFixed(1)} standard deviations from the mean`,
                    reason: `Statistical outlier: Expected range ${(stats.mean - stats.stdDev * 2).toFixed(2)} - ${(stats.mean + stats.stdDev * 2).toFixed(2)}`,
                    recommendedAction: 'Review transaction for accuracy',
                });
                continue;
            }

            // IQR method (Tukey's fences)
            const lowerFence = stats.q1 - this.iqrMultiplier * stats.iqr;
            const upperFence = stats.q3 + this.iqrMultiplier * stats.iqr;

            if (tx.amount < lowerFence || tx.amount > upperFence) {
                anomalies.push({
                    id: crypto.randomUUID(),
                    type: 'point',
                    transactionId: tx.id,
                    severity: 'medium',
                    riskScore: 50,
                    description: `Amount ${tx.amount} is outside expected bounds`,
                    reason: `IQR outlier: Expected ${lowerFence.toFixed(2)} - ${upperFence.toFixed(2)}`,
                    recommendedAction: 'Verify amount is correct',
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect contextual anomalies (unusual for context)
     */
    async detectContextualAnomalies(
        transactions: NormalizedTransaction[]
    ): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        for (const tx of transactions) {
            const vendorPattern = this.vendorPatterns.get(tx.vendorNormalized);

            // Check vendor-specific anomalies
            if (vendorPattern && vendorPattern.typicalAmounts.length >= 5) {
                const vendorStats = calculateStatistics(vendorPattern.typicalAmounts);
                const deviation = Math.abs(tx.amount - vendorStats.mean) / (vendorStats.stdDev || 1);

                if (deviation > 2) {
                    anomalies.push({
                        id: crypto.randomUUID(),
                        type: 'contextual',
                        transactionId: tx.id,
                        severity: deviation > 4 ? 'high' : 'medium',
                        riskScore: Math.min(100, deviation * 20),
                        description: `Amount differs from typical ${tx.vendor} transactions`,
                        reason: `Typical amount: ${vendorStats.mean.toFixed(2)}, this: ${tx.amount}`,
                        recommendedAction: 'Verify transaction with vendor',
                    });
                }
            }

            // Check timing anomalies
            const hour = tx.date.getHours();
            const dayOfWeek = tx.date.getDay();

            // Weekend transactions for business expenses
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                anomalies.push({
                    id: crypto.randomUUID(),
                    type: 'contextual',
                    transactionId: tx.id,
                    severity: 'low',
                    riskScore: 20,
                    description: 'Transaction occurred on weekend',
                    reason: 'Weekend business transactions are less common',
                    recommendedAction: 'Verify business purpose',
                });
            }

            // Late night/early morning transactions
            if (hour < 6 || hour > 22) {
                anomalies.push({
                    id: crypto.randomUUID(),
                    type: 'contextual',
                    transactionId: tx.id,
                    severity: 'low',
                    riskScore: 15,
                    description: 'Transaction occurred during unusual hours',
                    reason: `Transaction at ${hour}:00 is outside typical business hours`,
                    recommendedAction: 'Verify transaction timing',
                });
            }

            // Round number detection (potential fraud indicator)
            if (tx.amount >= 1000 && tx.amount % 1000 === 0) {
                anomalies.push({
                    id: crypto.randomUUID(),
                    type: 'contextual',
                    transactionId: tx.id,
                    severity: 'low',
                    riskScore: 25,
                    description: 'Suspiciously round amount',
                    reason: 'Round numbers may indicate estimated or fabricated amounts',
                    recommendedAction: 'Request supporting documentation',
                });
            }

            // First-time vendor
            if (!vendorPattern) {
                anomalies.push({
                    id: crypto.randomUUID(),
                    type: 'contextual',
                    transactionId: tx.id,
                    severity: 'low',
                    riskScore: 10,
                    description: 'First transaction with this vendor',
                    reason: 'New vendor relationship',
                    recommendedAction: 'Verify vendor legitimacy',
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect collective anomalies (suspicious patterns)
     */
    async detectCollectiveAnomalies(
        transactions: NormalizedTransaction[]
    ): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        // Group transactions by vendor
        const vendorGroups = new Map<string, NormalizedTransaction[]>();
        for (const tx of transactions) {
            const group = vendorGroups.get(tx.vendorNormalized) || [];
            group.push(tx);
            vendorGroups.set(tx.vendorNormalized, group);
        }

        // Check for duplicate payments (same vendor, same amount, close dates)
        for (const [vendor, txs] of vendorGroups) {
            if (txs.length < 2) continue;

            for (let i = 0; i < txs.length; i++) {
                for (let j = i + 1; j < txs.length; j++) {
                    const tx1 = txs[i];
                    const tx2 = txs[j];

                    const timeDiff = Math.abs(tx1.date.getTime() - tx2.date.getTime());
                    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                    // Same amount within 7 days = potential duplicate
                    if (tx1.amount === tx2.amount && daysDiff <= 7) {
                        anomalies.push({
                            id: crypto.randomUUID(),
                            type: 'collective',
                            transactionId: tx1.id,
                            severity: 'high',
                            riskScore: 80,
                            description: 'Potential duplicate payment detected',
                            reason: `Same vendor (${vendor}), same amount (${tx1.amount}), ${daysDiff.toFixed(0)} days apart`,
                            recommendedAction: 'Verify both payments are legitimate',
                            relatedTransactions: [tx2.id],
                        });
                    }
                }
            }
        }

        // Check for split transactions (avoiding approval thresholds)
        const dateGroups = new Map<string, NormalizedTransaction[]>();
        for (const tx of transactions) {
            const dateKey = tx.date.toISOString().split('T')[0];
            const group = dateGroups.get(dateKey) || [];
            group.push(tx);
            dateGroups.set(dateKey, group);
        }

        for (const [date, txs] of dateGroups) {
            // Check same vendor, same day, multiple small amounts
            const vendorDayGroups = new Map<string, NormalizedTransaction[]>();
            for (const tx of txs) {
                const key = tx.vendorNormalized;
                const group = vendorDayGroups.get(key) || [];
                group.push(tx);
                vendorDayGroups.set(key, group);
            }

            for (const [vendor, vendorTxs] of vendorDayGroups) {
                if (vendorTxs.length >= 3) {
                    const total = vendorTxs.reduce((sum, t) => sum + t.amount, 0);
                    const avg = total / vendorTxs.length;

                    // Multiple transactions with similar amounts may indicate splitting
                    const amounts = vendorTxs.map(t => t.amount);
                    const amountStats = calculateStatistics(amounts);
                    const cv = amountStats.stdDev / amountStats.mean; // Coefficient of variation

                    if (cv < 0.3 && total > 5000) { // Low variation, high total
                        anomalies.push({
                            id: crypto.randomUUID(),
                            type: 'collective',
                            transactionId: vendorTxs[0].id,
                            severity: 'high',
                            riskScore: 75,
                            description: 'Potential transaction splitting detected',
                            reason: `${vendorTxs.length} similar transactions to ${vendor} on ${date}, total: ${total.toFixed(2)}`,
                            recommendedAction: 'Review for approval threshold circumvention',
                            relatedTransactions: vendorTxs.slice(1).map(t => t.id),
                        });
                    }
                }
            }
        }

        return anomalies;
    }

    /**
     * Update vendor patterns with new transaction
     */
    async updatePatterns(tx: NormalizedTransaction, category: string): Promise<void> {
        let pattern = this.vendorPatterns.get(tx.vendorNormalized);

        if (!pattern) {
            pattern = {
                vendorId: tx.vendorNormalized,
                typicalAmounts: [],
                typicalDayOfWeek: [],
                typicalHours: [],
                categoryHistory: [],
                lastSeen: new Date(),
            };
            this.vendorPatterns.set(tx.vendorNormalized, pattern);
        }

        // Keep last 100 amounts
        pattern.typicalAmounts.push(tx.amount);
        if (pattern.typicalAmounts.length > 100) {
            pattern.typicalAmounts.shift();
        }

        pattern.typicalDayOfWeek.push(tx.date.getDay());
        pattern.typicalHours.push(tx.date.getHours());
        pattern.categoryHistory.push(category);
        pattern.lastSeen = new Date();
    }

    /**
     * Get severity from z-score
     */
    private getSeverityFromZScore(zScore: number): Severity {
        const absZ = Math.abs(zScore);
        if (absZ > 5) return 'critical';
        if (absZ > 4) return 'high';
        if (absZ > 3) return 'medium';
        return 'low';
    }

    /**
     * Calculate overall risk score
     */
    private calculateOverallRiskScore(anomalies: Anomaly[]): number {
        if (anomalies.length === 0) return 0;

        // Weighted sum with diminishing returns
        const sorted = [...anomalies].sort((a, b) => b.riskScore - a.riskScore);
        let totalScore = 0;
        let weight = 1;

        for (const anomaly of sorted.slice(0, 10)) { // Cap at top 10
            totalScore += anomaly.riskScore * weight;
            weight *= 0.8; // Diminishing weight
        }

        return Math.min(100, totalScore / 2);
    }

    /**
     * Generate recommendations based on anomalies
     */
    private generateRecommendations(anomalies: Anomaly[]): string[] {
        const recommendations: string[] = [];

        const highSeverity = anomalies.filter(a => a.severity === 'high' || a.severity === 'critical');
        const duplicates = anomalies.filter(a => a.description.includes('duplicate'));
        const splitting = anomalies.filter(a => a.description.includes('splitting'));

        if (highSeverity.length > 0) {
            recommendations.push(`Review ${highSeverity.length} high-severity anomalies immediately`);
        }

        if (duplicates.length > 0) {
            recommendations.push(`Investigate ${duplicates.length} potential duplicate payments`);
        }

        if (splitting.length > 0) {
            recommendations.push(`Review ${splitting.length} potential transaction splitting cases`);
        }

        if (anomalies.length > 20) {
            recommendations.push('Consider implementing stricter transaction approval workflows');
        }

        if (anomalies.length === 0) {
            recommendations.push('No significant anomalies detected');
        }

        return recommendations;
    }

    /**
     * Get pattern statistics
     */
    getPatternStats(): {
        vendorCount: number;
        categoryCount: number;
    } {
        return {
            vendorCount: this.vendorPatterns.size,
            categoryCount: this.categoryPatterns.size,
        };
    }
}
