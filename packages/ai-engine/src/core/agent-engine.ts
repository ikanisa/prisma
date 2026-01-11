/**
 * Prisma AI Agent Engine
 * 
 * Multi-model ensemble engine for autonomous transaction processing.
 * Combines precision (pattern matching), predictive (GPT-4), and anomaly detection models.
 * 
 * Industry targets:
 * - 95% auto-process rate (Docyt/Digits benchmark)
 * - 97%+ accuracy (Digits: 97.8%)
 * - <2 second processing time
 */

import OpenAI from 'openai';
import {
    type RawTransaction,
    type NormalizedTransaction,
    type ProcessedTransaction,
    type Prediction,
    type AgentDecision,
    type ProcessingResult,
    type ProcessingRoute,
    type UserFeedback,
    type AIEngineConfig,
    DEFAULT_CONFIG,
} from '../types.js';
import { getOpenAIClient } from './openai-client.js';

// ============================================================================
// PRECISION MODEL - Pattern Matching for Known Cases
// ============================================================================

interface VendorPattern {
    vendorPattern: string;
    category: string;
    account?: string;
    confidence: number;
    matchCount: number;
}

class PrecisionModel {
    private patterns: Map<string, VendorPattern> = new Map();

    constructor() {
        // Initialize with common patterns (would be loaded from DB in production)
        this.loadDefaultPatterns();
    }

    private loadDefaultPatterns(): void {
        const defaults: VendorPattern[] = [
            { vendorPattern: 'amazon', category: 'Office Supplies', confidence: 0.95, matchCount: 0 },
            { vendorPattern: 'uber', category: 'Transportation', confidence: 0.92, matchCount: 0 },
            { vendorPattern: 'starbucks', category: 'Meals & Entertainment', confidence: 0.94, matchCount: 0 },
            { vendorPattern: 'aws', category: 'Cloud Services', confidence: 0.98, matchCount: 0 },
            { vendorPattern: 'microsoft', category: 'Software Subscriptions', confidence: 0.96, matchCount: 0 },
            { vendorPattern: 'google', category: 'Software Subscriptions', confidence: 0.94, matchCount: 0 },
            { vendorPattern: 'payroll', category: 'Payroll Expenses', confidence: 0.99, matchCount: 0 },
            { vendorPattern: 'insurance', category: 'Insurance', confidence: 0.91, matchCount: 0 },
            { vendorPattern: 'rent', category: 'Rent & Facilities', confidence: 0.97, matchCount: 0 },
            { vendorPattern: 'utility', category: 'Utilities', confidence: 0.93, matchCount: 0 },
        ];

        for (const pattern of defaults) {
            this.patterns.set(pattern.vendorPattern.toLowerCase(), pattern);
        }
    }

    async predict(tx: NormalizedTransaction): Promise<Prediction> {
        const vendorLower = tx.vendorNormalized.toLowerCase();
        const descLower = tx.description.toLowerCase();

        // Check for exact vendor matches
        for (const [pattern, data] of this.patterns) {
            if (vendorLower.includes(pattern) || descLower.includes(pattern)) {
                return {
                    category: data.category,
                    confidence: data.confidence,
                    model: 'precision',
                    reasoning: `Matched pattern "${pattern}" with ${data.matchCount} historical matches`,
                };
            }
        }

        // No match found
        return {
            category: 'Uncategorized',
            confidence: 0.1,
            model: 'precision',
            reasoning: 'No matching pattern found in vendor database',
        };
    }

    async addPattern(pattern: VendorPattern): Promise<void> {
        this.patterns.set(pattern.vendorPattern.toLowerCase(), pattern);
    }

    async learnFromCorrection(
        tx: NormalizedTransaction,
        correctedCategory: string
    ): Promise<void> {
        const vendorLower = tx.vendorNormalized.toLowerCase();
        const existing = this.patterns.get(vendorLower);

        if (existing) {
            // Update existing pattern
            existing.category = correctedCategory;
            existing.matchCount++;
            existing.confidence = Math.min(0.99, existing.confidence + 0.01);
        } else {
            // Create new pattern
            this.patterns.set(vendorLower, {
                vendorPattern: vendorLower,
                category: correctedCategory,
                confidence: 0.85, // Start at 85% for learned patterns
                matchCount: 1,
            });
        }
    }
}

// ============================================================================
// PREDICTIVE MODEL - GPT-4 for Unknown Cases
// ============================================================================

class PredictiveModel {
    private openai: OpenAI | null = null;
    private modelId: string;
    private initAttempted = false;

    constructor(modelId: string = 'gpt-4') {
        this.modelId = modelId;
        // Lazy initialization - client created on first predict() call
    }

    private getClient(): OpenAI | null {
        if (!this.initAttempted) {
            this.initAttempted = true;
            const result = getOpenAIClient();
            this.openai = result.client;
            if (!result.available) {
                console.warn('[PredictiveModel] OpenAI unavailable:', result.error);
            }
        }
        return this.openai;
    }

    async predict(tx: NormalizedTransaction): Promise<Prediction> {
        // Check if OpenAI is available
        const client = this.getClient();
        if (!client) {
            return {
                category: 'Uncategorized',
                confidence: 0.0,
                model: 'predictive',
                reasoning: 'OpenAI API not available. Configure OPENAI_API_KEY for AI-powered categorization.',
            };
        }

        const systemPrompt = `You are an expert accountant categorizing financial transactions.
Given a transaction, determine the most appropriate expense/income category.

Common categories include:
- Office Supplies
- Software Subscriptions
- Professional Services
- Marketing & Advertising
- Travel & Transportation
- Meals & Entertainment
- Rent & Facilities
- Utilities
- Insurance
- Payroll Expenses
- Bank Fees
- Taxes & Licenses
- Equipment & Hardware
- Consulting Fees
- Legal & Accounting
- Research & Development
- Cost of Goods Sold
- Revenue - Sales
- Revenue - Services
- Interest Income/Expense

Respond with JSON: { "category": "...", "confidence": 0.XX, "reasoning": "..." }
The confidence should be between 0.0 and 1.0 based on how certain you are.`;

        const userPrompt = `Categorize this transaction:
Vendor: ${tx.vendor}
Description: ${tx.description}
Amount: ${tx.amount} ${tx.currency}
Date: ${tx.date.toISOString().split('T')[0]}
${tx.lineItems ? `Line Items: ${JSON.stringify(tx.lineItems)}` : ''}`;

        try {
            const response = await client.chat.completions.create({
                model: this.modelId,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.2,
                response_format: { type: 'json_object' },
                max_tokens: 200,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from model');
            }

            const result = JSON.parse(content) as {
                category: string;
                confidence: number;
                reasoning: string;
            };

            return {
                category: result.category,
                confidence: Math.min(0.99, Math.max(0.1, result.confidence)),
                model: 'predictive',
                reasoning: result.reasoning,
            };
        } catch (error) {
            console.error('Predictive model error:', error);
            return {
                category: 'Uncategorized',
                confidence: 0.0,
                model: 'predictive',
                reasoning: `Model error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
}

// ============================================================================
// ANOMALY MODEL - Statistical Outlier Detection
// ============================================================================

interface TransactionStats {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
}

class AnomalyModel {
    private categoryStats: Map<string, TransactionStats> = new Map();
    private vendorStats: Map<string, TransactionStats> = new Map();
    private zScoreThreshold: number;

    constructor(zScoreThreshold: number = 3) {
        this.zScoreThreshold = zScoreThreshold;
    }

    async predict(tx: NormalizedTransaction): Promise<Prediction> {
        // Check for anomalies based on amount
        const vendorStats = this.vendorStats.get(tx.vendorNormalized);

        let anomalyScore = 0;
        const reasons: string[] = [];

        if (vendorStats && vendorStats.count >= 5) {
            const zScore = Math.abs((tx.amount - vendorStats.mean) / vendorStats.stdDev);
            if (zScore > this.zScoreThreshold) {
                anomalyScore += 0.3;
                reasons.push(`Amount ${tx.amount} is ${zScore.toFixed(1)} std devs from vendor average ${vendorStats.mean.toFixed(2)}`);
            }
        }

        // Check for unusual timing (weekend transactions, off-hours)
        const hour = tx.date.getHours();
        const day = tx.date.getDay();
        if (day === 0 || day === 6) {
            anomalyScore += 0.1;
            reasons.push('Transaction occurred on weekend');
        }
        if (hour < 6 || hour > 22) {
            anomalyScore += 0.05;
            reasons.push('Transaction occurred during unusual hours');
        }

        // Check for round numbers (potential fraud indicator)
        if (tx.amount > 1000 && tx.amount % 1000 === 0) {
            anomalyScore += 0.05;
            reasons.push('Suspiciously round number');
        }

        // Convert anomaly score to confidence (inverse relationship)
        const confidence = Math.max(0.1, 1 - anomalyScore);

        return {
            category: 'normal', // Anomaly model doesn't categorize
            confidence,
            model: 'anomaly',
            reasoning: reasons.length > 0
                ? `Anomaly flags: ${reasons.join('; ')}`
                : 'No anomalies detected',
        };
    }

    async updateStats(
        tx: NormalizedTransaction,
        category: string
    ): Promise<void> {
        // Update vendor stats
        const vendorKey = tx.vendorNormalized;
        const existing = this.vendorStats.get(vendorKey);

        if (existing) {
            // Incremental update (Welford's algorithm)
            const n = existing.count + 1;
            const delta = tx.amount - existing.mean;
            const newMean = existing.mean + delta / n;
            const delta2 = tx.amount - newMean;
            const newM2 = (existing.stdDev ** 2 * (existing.count - 1)) + delta * delta2;

            existing.mean = newMean;
            existing.stdDev = Math.sqrt(newM2 / (n - 1));
            existing.min = Math.min(existing.min, tx.amount);
            existing.max = Math.max(existing.max, tx.amount);
            existing.count = n;
        } else {
            this.vendorStats.set(vendorKey, {
                mean: tx.amount,
                stdDev: 0,
                min: tx.amount,
                max: tx.amount,
                count: 1,
            });
        }
    }
}

// ============================================================================
// MAIN AGENT ENGINE
// ============================================================================

export class PrismaAgentEngine {
    private precisionModel: PrecisionModel;
    private predictiveModel: PredictiveModel;
    private anomalyModel: AnomalyModel;
    private config: AIEngineConfig;

    constructor(config: Partial<AIEngineConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.precisionModel = new PrecisionModel();
        this.predictiveModel = new PredictiveModel(this.config.models.predictive.model);
        this.anomalyModel = new AnomalyModel(this.config.models.anomaly.zScoreThreshold);
    }

    /**
     * Process a transaction through the multi-model pipeline
     */
    async processTransaction(tx: RawTransaction): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            // Step 1: Normalize the transaction
            const normalized = await this.normalizeTransaction(tx);

            // Step 2: Run all models in parallel
            const [precisionPred, predictivePred, anomalyPred] = await Promise.all([
                this.config.models.precision.enabled
                    ? this.precisionModel.predict(normalized)
                    : Promise.resolve(null),
                this.config.models.predictive.enabled
                    ? this.predictiveModel.predict(normalized)
                    : Promise.resolve(null),
                this.config.models.anomaly.enabled
                    ? this.anomalyModel.predict(normalized)
                    : Promise.resolve(null),
            ]);

            const predictions = [precisionPred, predictivePred, anomalyPred].filter(
                (p): p is Prediction => p !== null
            );

            // Step 3: Ensemble vote
            const decision = this.ensembleVote(predictions);

            // Step 4: Determine route based on confidence
            const route = this.determineRoute(decision.confidence);

            // Step 5: Build processed transaction
            const processed: ProcessedTransaction = {
                ...normalized,
                category: decision.category,
                categoryConfidence: decision.confidence,
                autoProcessed: route === 'auto',
                humanReviewed: false,
                processingTimeMs: Date.now() - startTime,
                modelUsed: this.getPrimaryModel(predictions),
                reasoning: decision.reasoning,
            };

            return {
                success: true,
                transaction: processed,
                decision: {
                    ...decision,
                    route,
                    predictions,
                },
            };
        } catch (error) {
            return {
                success: false,
                transaction: {} as ProcessedTransaction,
                decision: {} as AgentDecision,
                errors: [{
                    code: 'PROCESSING_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                }],
            };
        }
    }

    /**
     * Learn from user correction
     */
    async learn(feedback: UserFeedback): Promise<void> {
        if (!this.config.learning.enabled) return;

        // Update precision model with new pattern
        await this.precisionModel.learnFromCorrection(
            { vendorNormalized: feedback.originalValue } as NormalizedTransaction,
            feedback.correctedValue
        );

        // Log for batch retraining
        console.log(`[AI Engine] Learned correction: ${feedback.originalValue} -> ${feedback.correctedValue}`);
    }

    /**
     * Normalize raw transaction data
     */
    private async normalizeTransaction(tx: RawTransaction): Promise<NormalizedTransaction> {
        return {
            id: tx.id,
            type: tx.type,
            date: tx.date,
            amount: tx.amount,
            currency: tx.currency,
            description: tx.description,
            vendor: tx.vendor || this.extractVendor(tx.description),
            vendorNormalized: this.normalizeVendor(tx.vendor || tx.description),
            reference: tx.reference,
        };
    }

    /**
     * Extract vendor name from description
     */
    private extractVendor(description: string): string {
        // Simple extraction: take first 2-3 words before common separators
        const match = description.match(/^([A-Za-z0-9\s&]+?)(?:\s*[-*#]|\s+\d|$)/);
        return match?.[1]?.trim() || description.substring(0, 30);
    }

    /**
     * Normalize vendor name for matching
     */
    private normalizeVendor(vendor: string): string {
        return vendor
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 50);
    }

    /**
     * Ensemble vote from multiple model predictions
     */
    private ensembleVote(predictions: Prediction[]): AgentDecision {
        const weights: Record<Prediction['model'], number> = {
            precision: this.config.models.precision.weight,
            predictive: this.config.models.predictive.weight,
            anomaly: this.config.models.anomaly.weight,
        };

        // Filter out anomaly model from category voting (it doesn't categorize)
        const categoryPredictions = predictions.filter(p => p.model !== 'anomaly');

        if (categoryPredictions.length === 0) {
            return {
                category: 'Uncategorized',
                confidence: 0,
                route: 'reject',
                reasoning: 'No category predictions available',
                predictions: [],
            };
        }

        // Weighted vote for best category
        const categoryScores = new Map<string, number>();
        let totalWeight = 0;

        for (const pred of categoryPredictions) {
            const weight = weights[pred.model] * pred.confidence;
            totalWeight += weight;

            const current = categoryScores.get(pred.category) || 0;
            categoryScores.set(pred.category, current + weight);
        }

        // Find winning category
        let bestCategory = 'Uncategorized';
        let bestScore = 0;
        for (const [category, score] of categoryScores) {
            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }

        // Calculate final confidence
        const normalizedConfidence = totalWeight > 0 ? bestScore / totalWeight : 0;

        // Apply anomaly penalty
        const anomalyPred = predictions.find(p => p.model === 'anomaly');
        const anomalyPenalty = anomalyPred ? (1 - anomalyPred.confidence) * 0.2 : 0;
        const finalConfidence = Math.max(0, normalizedConfidence - anomalyPenalty);

        // Build reasoning
        const reasoningParts = categoryPredictions
            .filter(p => p.category === bestCategory)
            .map(p => `${p.model}: ${p.reasoning}`);

        if (anomalyPred && anomalyPred.confidence < 0.9) {
            reasoningParts.push(`Anomaly: ${anomalyPred.reasoning}`);
        }

        return {
            category: bestCategory,
            confidence: finalConfidence,
            route: this.determineRoute(finalConfidence),
            reasoning: reasoningParts.join(' | '),
            predictions,
            anomalyFlags: anomalyPred && anomalyPred.confidence < 0.9
                ? [anomalyPred.reasoning || 'Anomaly detected']
                : undefined,
        };
    }

    /**
     * Determine processing route based on confidence
     */
    private determineRoute(confidence: number): ProcessingRoute {
        if (confidence >= this.config.thresholds.autoProcess) {
            return 'auto';
        }
        if (confidence >= this.config.thresholds.humanReview) {
            return 'human-review';
        }
        return 'reject';
    }

    /**
     * Get primary model that determined the category
     */
    private getPrimaryModel(predictions: Prediction[]): string {
        const categoryPreds = predictions.filter(p => p.model !== 'anomaly');
        if (categoryPreds.length === 0) return 'none';

        // Return model with highest confidence
        return categoryPreds.reduce((a, b) =>
            a.confidence > b.confidence ? a : b
        ).model;
    }

    /**
     * Get current configuration
     */
    getConfig(): AIEngineConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<AIEngineConfig>): void {
        this.config = { ...this.config, ...updates };
    }
}
