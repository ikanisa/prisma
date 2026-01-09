/**
 * Real-Time Reconciliation Engine
 * 
 * AI-powered transaction matching with:
 * - Auto-matching with confidence scoring
 * - Fuzzy matching for amounts and descriptions
 * - Pattern-based matching rules
 * - Discrepancy identification and resolution
 */

import { type NormalizedTransaction } from '../types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ReconciliationSource {
    id: string;
    name: string;
    type: 'book' | 'bank' | 'credit_card' | 'external';
    transactions: ReconciliationTransaction[];
}

export interface ReconciliationTransaction {
    id: string;
    sourceId: string;
    date: Date;
    amount: number;
    description: string;
    reference?: string;
    vendor?: string;
    status: 'unmatched' | 'matched' | 'partial' | 'excluded';
    matchedTo?: string[]; // IDs of matched transactions
    matchConfidence?: number;
}

export interface MatchResult {
    sourceTransaction: ReconciliationTransaction;
    targetTransaction: ReconciliationTransaction;
    confidence: number;
    matchType: 'exact' | 'amount' | 'fuzzy' | 'manual' | 'rule_based';
    reasons: string[];
}

export interface ReconciliationSession {
    id: string;
    sourceA: ReconciliationSource;
    sourceB: ReconciliationSource;
    matches: MatchResult[];
    unmatchedA: ReconciliationTransaction[];
    unmatchedB: ReconciliationTransaction[];
    autoMatchRate: number;
    discrepancies: Discrepancy[];
    status: 'in_progress' | 'review' | 'completed';
    createdAt: Date;
    completedAt?: Date;
}

export interface Discrepancy {
    id: string;
    type: 'missing_source' | 'missing_target' | 'amount_mismatch' | 'date_mismatch' | 'duplicate';
    severity: 'low' | 'medium' | 'high';
    amount: number;
    description: string;
    suggestedResolution?: string;
    resolved: boolean;
}

export interface MatchingRule {
    id: string;
    name: string;
    priority: number;
    conditions: RuleCondition[];
    action: 'match' | 'exclude' | 'flag';
    confidenceBoost: number;
}

interface RuleCondition {
    field: 'amount' | 'date' | 'description' | 'vendor' | 'reference';
    operator: 'equals' | 'contains' | 'starts_with' | 'within' | 'regex';
    value: string | number;
    tolerance?: number; // For numeric comparisons
}

// ============================================================================
// RECONCILIATION ENGINE
// ============================================================================

export class ReconciliationEngine {
    private rules: MatchingRule[] = [];
    private amountTolerance: number;
    private dateTolerance: number; // days

    constructor(options: {
        amountTolerance?: number;
        dateTolerance?: number;
    } = {}) {
        this.amountTolerance = options.amountTolerance ?? 0.01;
        this.dateTolerance = options.dateTolerance ?? 3;
        this.loadDefaultRules();
    }

    /**
     * Run full reconciliation between two sources
     */
    async reconcile(
        sourceA: ReconciliationSource,
        sourceB: ReconciliationSource
    ): Promise<ReconciliationSession> {
        const session: ReconciliationSession = {
            id: crypto.randomUUID(),
            sourceA,
            sourceB,
            matches: [],
            unmatchedA: [...sourceA.transactions],
            unmatchedB: [...sourceB.transactions],
            autoMatchRate: 0,
            discrepancies: [],
            status: 'in_progress',
            createdAt: new Date(),
        };

        // Step 1: Exact matches (same amount, same date, same reference)
        await this.findExactMatches(session);

        // Step 2: Amount matches (same amount, date within tolerance)
        await this.findAmountMatches(session);

        // Step 3: Fuzzy matches (similar amount/description)
        await this.findFuzzyMatches(session);

        // Step 4: Apply custom rules
        await this.applyMatchingRules(session);

        // Step 5: Identify discrepancies
        this.identifyDiscrepancies(session);

        // Calculate metrics
        const totalTransactions = sourceA.transactions.length + sourceB.transactions.length;
        const matchedTransactions = session.matches.length * 2;
        session.autoMatchRate = totalTransactions > 0 ? matchedTransactions / totalTransactions : 0;

        session.status = session.unmatchedA.length === 0 && session.unmatchedB.length === 0
            ? 'completed'
            : 'review';

        return session;
    }

    /**
     * Find exact matches
     */
    private async findExactMatches(session: ReconciliationSession): Promise<void> {
        const toRemoveA: Set<string> = new Set();
        const toRemoveB: Set<string> = new Set();

        for (const txA of session.unmatchedA) {
            for (const txB of session.unmatchedB) {
                if (toRemoveB.has(txB.id)) continue;

                // Check for exact match
                if (
                    Math.abs(txA.amount - txB.amount) < 0.01 &&
                    this.isSameDate(txA.date, txB.date) &&
                    txA.reference && txB.reference && txA.reference === txB.reference
                ) {
                    session.matches.push({
                        sourceTransaction: txA,
                        targetTransaction: txB,
                        confidence: 1.0,
                        matchType: 'exact',
                        reasons: ['Exact amount', 'Same date', 'Matching reference'],
                    });

                    txA.status = 'matched';
                    txA.matchedTo = [txB.id];
                    txA.matchConfidence = 1.0;

                    txB.status = 'matched';
                    txB.matchedTo = [txA.id];
                    txB.matchConfidence = 1.0;

                    toRemoveA.add(txA.id);
                    toRemoveB.add(txB.id);
                    break;
                }
            }
        }

        session.unmatchedA = session.unmatchedA.filter(tx => !toRemoveA.has(tx.id));
        session.unmatchedB = session.unmatchedB.filter(tx => !toRemoveB.has(tx.id));
    }

    /**
     * Find amount-based matches
     */
    private async findAmountMatches(session: ReconciliationSession): Promise<void> {
        const toRemoveA: Set<string> = new Set();
        const toRemoveB: Set<string> = new Set();

        for (const txA of session.unmatchedA) {
            let bestMatch: { tx: ReconciliationTransaction; confidence: number } | null = null;

            for (const txB of session.unmatchedB) {
                if (toRemoveB.has(txB.id)) continue;

                // Check amount match with date tolerance
                if (
                    Math.abs(txA.amount - txB.amount) <= this.amountTolerance &&
                    this.isWithinDateTolerance(txA.date, txB.date)
                ) {
                    const confidence = this.calculateAmountMatchConfidence(txA, txB);

                    if (!bestMatch || confidence > bestMatch.confidence) {
                        bestMatch = { tx: txB, confidence };
                    }
                }
            }

            if (bestMatch && bestMatch.confidence >= 0.85) {
                session.matches.push({
                    sourceTransaction: txA,
                    targetTransaction: bestMatch.tx,
                    confidence: bestMatch.confidence,
                    matchType: 'amount',
                    reasons: ['Matching amount', 'Date within tolerance'],
                });

                txA.status = 'matched';
                txA.matchedTo = [bestMatch.tx.id];
                txA.matchConfidence = bestMatch.confidence;

                bestMatch.tx.status = 'matched';
                bestMatch.tx.matchedTo = [txA.id];
                bestMatch.tx.matchConfidence = bestMatch.confidence;

                toRemoveA.add(txA.id);
                toRemoveB.add(bestMatch.tx.id);
            }
        }

        session.unmatchedA = session.unmatchedA.filter(tx => !toRemoveA.has(tx.id));
        session.unmatchedB = session.unmatchedB.filter(tx => !toRemoveB.has(tx.id));
    }

    /**
     * Find fuzzy matches using description similarity
     */
    private async findFuzzyMatches(session: ReconciliationSession): Promise<void> {
        const toRemoveA: Set<string> = new Set();
        const toRemoveB: Set<string> = new Set();

        for (const txA of session.unmatchedA) {
            let bestMatch: { tx: ReconciliationTransaction; confidence: number; reasons: string[] } | null = null;

            for (const txB of session.unmatchedB) {
                if (toRemoveB.has(txB.id)) continue;

                const amountDiff = Math.abs(txA.amount - txB.amount);
                const amountDiffPercent = Math.abs(txA.amount) > 0 ? amountDiff / Math.abs(txA.amount) : 0;

                // Allow 5% amount tolerance for fuzzy matching
                if (amountDiffPercent <= 0.05 && this.isWithinDateTolerance(txA.date, txB.date)) {
                    const descSimilarity = this.calculateStringSimilarity(
                        txA.description.toLowerCase(),
                        txB.description.toLowerCase()
                    );

                    if (descSimilarity >= 0.6) {
                        const confidence = (descSimilarity * 0.6) + ((1 - amountDiffPercent) * 0.4);
                        const reasons = [];

                        if (amountDiff < 1) reasons.push('Nearly matching amount');
                        if (descSimilarity > 0.8) reasons.push('Similar description');

                        if (!bestMatch || confidence > bestMatch.confidence) {
                            bestMatch = { tx: txB, confidence, reasons };
                        }
                    }
                }
            }

            if (bestMatch && bestMatch.confidence >= 0.75) {
                session.matches.push({
                    sourceTransaction: txA,
                    targetTransaction: bestMatch.tx,
                    confidence: bestMatch.confidence,
                    matchType: 'fuzzy',
                    reasons: bestMatch.reasons,
                });

                txA.status = 'matched';
                txA.matchedTo = [bestMatch.tx.id];
                txA.matchConfidence = bestMatch.confidence;

                bestMatch.tx.status = 'matched';
                bestMatch.tx.matchedTo = [txA.id];
                bestMatch.tx.matchConfidence = bestMatch.confidence;

                toRemoveA.add(txA.id);
                toRemoveB.add(bestMatch.tx.id);
            }
        }

        session.unmatchedA = session.unmatchedA.filter(tx => !toRemoveA.has(tx.id));
        session.unmatchedB = session.unmatchedB.filter(tx => !toRemoveB.has(tx.id));
    }

    /**
     * Apply custom matching rules
     */
    private async applyMatchingRules(session: ReconciliationSession): Promise<void> {
        const sortedRules = [...this.rules].sort((a, b) => a.priority - b.priority);

        for (const rule of sortedRules) {
            if (rule.action === 'exclude') {
                // Exclude matching transactions
                session.unmatchedA = session.unmatchedA.filter(tx => {
                    if (this.matchesRule(tx, rule)) {
                        tx.status = 'excluded';
                        return false;
                    }
                    return true;
                });

                session.unmatchedB = session.unmatchedB.filter(tx => {
                    if (this.matchesRule(tx, rule)) {
                        tx.status = 'excluded';
                        return false;
                    }
                    return true;
                });
            }
        }
    }

    /**
     * Identify discrepancies from unmatched items
     */
    private identifyDiscrepancies(session: ReconciliationSession): void {
        // Missing from source B
        for (const tx of session.unmatchedA) {
            session.discrepancies.push({
                id: crypto.randomUUID(),
                type: 'missing_target',
                severity: Math.abs(tx.amount) > 1000 ? 'high' : Math.abs(tx.amount) > 100 ? 'medium' : 'low',
                amount: tx.amount,
                description: `Transaction in ${session.sourceA.name} not found in ${session.sourceB.name}: ${tx.description}`,
                suggestedResolution: 'Verify transaction was recorded in both systems',
                resolved: false,
            });
        }

        // Missing from source A
        for (const tx of session.unmatchedB) {
            session.discrepancies.push({
                id: crypto.randomUUID(),
                type: 'missing_source',
                severity: Math.abs(tx.amount) > 1000 ? 'high' : Math.abs(tx.amount) > 100 ? 'medium' : 'low',
                amount: tx.amount,
                description: `Transaction in ${session.sourceB.name} not found in ${session.sourceA.name}: ${tx.description}`,
                suggestedResolution: 'Verify transaction was recorded in both systems',
                resolved: false,
            });
        }
    }

    /**
     * Add a matching rule
     */
    addRule(rule: MatchingRule): void {
        this.rules.push(rule);
    }

    /**
     * Load default matching rules
     */
    private loadDefaultRules(): void {
        this.rules = [
            {
                id: 'exclude-voided',
                name: 'Exclude voided transactions',
                priority: 1,
                conditions: [
                    { field: 'description', operator: 'contains', value: 'VOID' },
                ],
                action: 'exclude',
                confidenceBoost: 0,
            },
            {
                id: 'exclude-zero',
                name: 'Exclude zero amount transactions',
                priority: 2,
                conditions: [
                    { field: 'amount', operator: 'equals', value: 0, tolerance: 0.001 },
                ],
                action: 'exclude',
                confidenceBoost: 0,
            },
        ];
    }

    /**
     * Check if transaction matches a rule
     */
    private matchesRule(tx: ReconciliationTransaction, rule: MatchingRule): boolean {
        return rule.conditions.every(condition => {
            switch (condition.field) {
                case 'amount':
                    const tolerance = condition.tolerance ?? 0;
                    if (condition.operator === 'equals') {
                        return Math.abs(tx.amount - (condition.value as number)) <= tolerance;
                    }
                    break;
                case 'description':
                    if (condition.operator === 'contains') {
                        return tx.description.toLowerCase().includes((condition.value as string).toLowerCase());
                    }
                    break;
            }
            return false;
        });
    }

    /**
     * Check if dates are the same day
     */
    private isSameDate(a: Date, b: Date): boolean {
        return a.toISOString().split('T')[0] === b.toISOString().split('T')[0];
    }

    /**
     * Check if dates are within tolerance
     */
    private isWithinDateTolerance(a: Date, b: Date): boolean {
        const diffMs = Math.abs(a.getTime() - b.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= this.dateTolerance;
    }

    /**
     * Calculate confidence for amount match
     */
    private calculateAmountMatchConfidence(a: ReconciliationTransaction, b: ReconciliationTransaction): number {
        let confidence = 0.85; // Base confidence for amount match

        // Boost for same date
        if (this.isSameDate(a.date, b.date)) {
            confidence += 0.05;
        }

        // Boost for similar description
        const descSimilarity = this.calculateStringSimilarity(
            a.description.toLowerCase(),
            b.description.toLowerCase()
        );
        confidence += descSimilarity * 0.1;

        return Math.min(0.99, confidence);
    }

    /**
     * Calculate string similarity (Jaccard index on words)
     */
    private calculateStringSimilarity(a: string, b: string): number {
        const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
        const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));

        if (wordsA.size === 0 && wordsB.size === 0) return 1;
        if (wordsA.size === 0 || wordsB.size === 0) return 0;

        let intersection = 0;
        for (const word of wordsA) {
            if (wordsB.has(word)) intersection++;
        }

        const union = wordsA.size + wordsB.size - intersection;
        return intersection / union;
    }
}
