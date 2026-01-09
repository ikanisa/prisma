/**
 * Autonomous Transaction Processor
 * 
 * End-to-end transaction processing with OCR, normalization,
 * AI categorization, and confidence-based routing.
 */

import {
    type RawTransaction,
    type NormalizedTransaction,
    type ProcessedTransaction,
    type ProcessingResult,
    type TransactionType,
} from '../types.js';
import { PrismaAgentEngine } from '../core/agent-engine.js';
import { ConfidenceRouter } from '../core/confidence-router.js';
import { AnomalyDetector } from './anomaly-detector.js';

// ============================================================================
// PROCESSOR TYPES
// ============================================================================

export interface ProcessorStats {
    totalProcessed: number;
    autoProcessed: number;
    humanReviewed: number;
    rejected: number;
    avgConfidence: number;
    avgProcessingTimeMs: number;
    byCategory: Record<string, number>;
    byRoute: Record<string, number>;
}

export interface BatchProcessingResult {
    success: boolean;
    processed: ProcessedTransaction[];
    errors: Array<{ transactionId: string; error: string }>;
    stats: {
        total: number;
        succeeded: number;
        failed: number;
        avgConfidence: number;
        totalTimeMs: number;
    };
}

// ============================================================================
// TRANSACTION PROCESSOR
// ============================================================================

export class TransactionProcessor {
    private engine: PrismaAgentEngine;
    private router: ConfidenceRouter;
    private anomalyDetector: AnomalyDetector;
    private stats: ProcessorStats;

    constructor() {
        this.engine = new PrismaAgentEngine();
        this.router = new ConfidenceRouter();
        this.anomalyDetector = new AnomalyDetector();
        this.stats = this.initStats();
    }

    /**
     * Process a single transaction
     */
    async process(transaction: RawTransaction): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            // Process through AI engine
            const result = await this.engine.processTransaction(transaction);

            if (!result.success) {
                this.updateStats('rejected', result);
                return result;
            }

            // Run anomaly detection
            const anomalies = await this.anomalyDetector.detectAnomalies([
                this.toNormalized(result.transaction)
            ]);
            result.anomalies = anomalies.anomalies.point
                .concat(anomalies.anomalies.contextual)
                .concat(anomalies.anomalies.collective);

            // Route based on confidence
            const routeDecision = this.router.route(result);
            result.decision.route = routeDecision.route;

            // Queue for review if needed
            if (routeDecision.route === 'human-review') {
                this.router.enqueueForReview(result);
            }

            // Update patterns for learning
            await this.anomalyDetector.updatePatterns(
                this.toNormalized(result.transaction),
                result.decision.category
            );

            // Update stats
            this.updateStats(routeDecision.route, result);

            return result;
        } catch (error) {
            return {
                success: false,
                transaction: {} as ProcessedTransaction,
                decision: {} as any,
                errors: [{
                    code: 'PROCESSOR_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                }],
            };
        }
    }

    /**
     * Process multiple transactions in batch
     */
    async processBatch(
        transactions: RawTransaction[],
        options: { concurrency?: number } = {}
    ): Promise<BatchProcessingResult> {
        const concurrency = options.concurrency ?? 5;
        const startTime = Date.now();
        const processed: ProcessedTransaction[] = [];
        const errors: Array<{ transactionId: string; error: string }> = [];
        let totalConfidence = 0;

        // Process in batches
        for (let i = 0; i < transactions.length; i += concurrency) {
            const batch = transactions.slice(i, i + concurrency);
            const results = await Promise.allSettled(
                batch.map(tx => this.process(tx))
            );

            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                const tx = batch[j];

                if (result.status === 'fulfilled' && result.value.success) {
                    processed.push(result.value.transaction);
                    totalConfidence += result.value.decision.confidence;
                } else {
                    const errorMsg = result.status === 'rejected'
                        ? result.reason?.message
                        : result.value.errors?.[0]?.message || 'Unknown error';
                    errors.push({ transactionId: tx.id, error: errorMsg });
                }
            }
        }

        return {
            success: errors.length === 0,
            processed,
            errors,
            stats: {
                total: transactions.length,
                succeeded: processed.length,
                failed: errors.length,
                avgConfidence: processed.length > 0 ? totalConfidence / processed.length : 0,
                totalTimeMs: Date.now() - startTime,
            },
        };
    }

    /**
     * Get processing statistics
     */
    getStats(): ProcessorStats {
        return { ...this.stats };
    }

    /**
     * Get pending review queue
     */
    getPendingReviews(limit?: number) {
        return this.router.getPendingReviews(limit);
    }

    /**
     * Get review queue stats
     */
    getQueueStats() {
        return this.router.getQueueStats();
    }

    /**
     * Complete a review
     */
    async completeReview(
        itemId: string,
        approved: boolean,
        correctedCategory?: string,
        userId?: string
    ): Promise<void> {
        this.router.completeReview(itemId, approved, correctedCategory);

        if (correctedCategory) {
            // Learn from correction
            await this.engine.learn({
                transactionId: itemId,
                userId: userId || 'system',
                feedbackType: 'category',
                originalValue: '',
                correctedValue: correctedCategory,
                originalConfidence: 0,
                timestamp: new Date(),
            });
        }
    }

    /**
     * Parse document to transaction (placeholder for OCR)
     */
    async parseDocument(
        document: { id: string; url: string; mimeType: string }
    ): Promise<Partial<RawTransaction>> {
        // In production, this would call OCR service (Google Vision, Tesseract, etc.)
        // For now, return placeholder
        return {
            type: 'invoice' as TransactionType,
            document,
            description: 'Document pending OCR processing',
            amount: 0,
            currency: 'USD',
            date: new Date(),
        };
    }

    /**
     * Parse bank feed entry
     */
    parseBankFeed(entry: {
        id: string;
        date: string;
        amount: number;
        description: string;
        type: 'debit' | 'credit';
        accountId: string;
    }): RawTransaction {
        return {
            id: entry.id,
            type: entry.type === 'debit' ? 'payment' : 'transfer',
            date: new Date(entry.date),
            amount: Math.abs(entry.amount),
            currency: 'USD', // Would come from account
            description: entry.description,
            metadata: {
                accountId: entry.accountId,
                originalType: entry.type,
            },
        };
    }

    /**
     * Initialize stats
     */
    private initStats(): ProcessorStats {
        return {
            totalProcessed: 0,
            autoProcessed: 0,
            humanReviewed: 0,
            rejected: 0,
            avgConfidence: 0,
            avgProcessingTimeMs: 0,
            byCategory: {},
            byRoute: {},
        };
    }

    /**
     * Update stats after processing
     */
    private updateStats(route: string, result: ProcessingResult): void {
        this.stats.totalProcessed++;

        switch (route) {
            case 'auto':
                this.stats.autoProcessed++;
                break;
            case 'human-review':
                this.stats.humanReviewed++;
                break;
            case 'reject':
            case 'rejected':
                this.stats.rejected++;
                break;
        }

        if (result.success) {
            // Update average confidence
            const n = this.stats.totalProcessed;
            this.stats.avgConfidence =
                (this.stats.avgConfidence * (n - 1) + result.decision.confidence) / n;

            // Update average processing time
            this.stats.avgProcessingTimeMs =
                (this.stats.avgProcessingTimeMs * (n - 1) + result.transaction.processingTimeMs) / n;

            // Update category counts
            const cat = result.decision.category;
            this.stats.byCategory[cat] = (this.stats.byCategory[cat] || 0) + 1;
        }

        // Update route counts
        this.stats.byRoute[route] = (this.stats.byRoute[route] || 0) + 1;
    }

    /**
     * Convert ProcessedTransaction to NormalizedTransaction
     */
    private toNormalized(tx: ProcessedTransaction): NormalizedTransaction {
        return {
            id: tx.id,
            type: tx.type,
            date: tx.date,
            amount: tx.amount,
            currency: tx.currency,
            description: tx.description,
            vendor: tx.vendor,
            vendorNormalized: tx.vendorNormalized,
            reference: tx.reference,
            lineItems: tx.lineItems,
        };
    }
}
