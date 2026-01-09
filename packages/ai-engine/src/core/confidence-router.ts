/**
 * Confidence-Based Router
 * 
 * Routes transactions to appropriate workflow based on AI confidence:
 * - auto: 95%+ confidence -> auto-process
 * - human-review: 80-95% -> queue for human review
 * - reject: <80% -> flag for manual entry
 */

import {
    type ProcessingResult,
    type ProcessingRoute,
    type ConfidenceThresholds,
    DEFAULT_THRESHOLDS,
} from '../types.js';

export interface RouteDecision {
    route: ProcessingRoute;
    confidence: number;
    reason: string;
    priority: 'low' | 'medium' | 'high';
    estimatedReviewTime?: number; // minutes
}

export interface ReviewQueueItem {
    id: string;
    transactionId: string;
    confidence: number;
    suggestedCategory: string;
    alternativeCategories: string[];
    reasoning: string;
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
    assignedTo?: string;
    status: 'pending' | 'in-review' | 'completed';
}

export class ConfidenceRouter {
    private thresholds: ConfidenceThresholds;
    private reviewQueue: ReviewQueueItem[] = [];

    constructor(thresholds: ConfidenceThresholds = DEFAULT_THRESHOLDS) {
        this.thresholds = thresholds;
    }

    /**
     * Route a processing result to appropriate workflow
     */
    route(result: ProcessingResult): RouteDecision {
        const { confidence } = result.decision;

        if (confidence >= this.thresholds.autoProcess) {
            return {
                route: 'auto',
                confidence,
                reason: `High confidence (${(confidence * 100).toFixed(1)}%) - automatically processed`,
                priority: 'low',
            };
        }

        if (confidence >= this.thresholds.humanReview) {
            const priority = this.calculatePriority(result);
            return {
                route: 'human-review',
                confidence,
                reason: `Medium confidence (${(confidence * 100).toFixed(1)}%) - requires human review`,
                priority,
                estimatedReviewTime: this.estimateReviewTime(result),
            };
        }

        return {
            route: 'reject',
            confidence,
            reason: `Low confidence (${(confidence * 100).toFixed(1)}%) - manual entry required`,
            priority: 'high',
            estimatedReviewTime: 10, // 10 minutes for manual entry
        };
    }

    /**
     * Add item to review queue
     */
    enqueueForReview(result: ProcessingResult): ReviewQueueItem {
        const item: ReviewQueueItem = {
            id: crypto.randomUUID(),
            transactionId: result.transaction.id,
            confidence: result.decision.confidence,
            suggestedCategory: result.decision.category,
            alternativeCategories: result.decision.predictions
                .filter(p => p.category !== result.decision.category)
                .map(p => p.category),
            reasoning: result.decision.reasoning,
            priority: this.calculatePriority(result),
            createdAt: new Date(),
            status: 'pending',
        };

        this.reviewQueue.push(item);
        this.sortQueue();

        return item;
    }

    /**
     * Get pending review items
     */
    getPendingReviews(limit: number = 20): ReviewQueueItem[] {
        return this.reviewQueue
            .filter(item => item.status === 'pending')
            .slice(0, limit);
    }

    /**
     * Get review queue stats
     */
    getQueueStats(): {
        total: number;
        pending: number;
        inReview: number;
        completed: number;
        avgConfidence: number;
        highPriorityCount: number;
    } {
        const pending = this.reviewQueue.filter(i => i.status === 'pending');
        const inReview = this.reviewQueue.filter(i => i.status === 'in-review');
        const completed = this.reviewQueue.filter(i => i.status === 'completed');

        const avgConfidence = pending.length > 0
            ? pending.reduce((sum, i) => sum + i.confidence, 0) / pending.length
            : 0;

        return {
            total: this.reviewQueue.length,
            pending: pending.length,
            inReview: inReview.length,
            completed: completed.length,
            avgConfidence,
            highPriorityCount: pending.filter(i => i.priority === 'high').length,
        };
    }

    /**
     * Mark item as in-review
     */
    startReview(itemId: string, userId: string): ReviewQueueItem | null {
        const item = this.reviewQueue.find(i => i.id === itemId);
        if (item) {
            item.status = 'in-review';
            item.assignedTo = userId;
        }
        return item || null;
    }

    /**
     * Complete review
     */
    completeReview(itemId: string, approved: boolean, correctedCategory?: string): void {
        const item = this.reviewQueue.find(i => i.id === itemId);
        if (item) {
            item.status = 'completed';
            if (correctedCategory) {
                item.suggestedCategory = correctedCategory;
            }
        }
    }

    /**
     * Calculate priority based on various factors
     */
    private calculatePriority(result: ProcessingResult): 'low' | 'medium' | 'high' {
        const { confidence } = result.decision;
        const amount = result.transaction.amount;
        const hasAnomalies = result.decision.anomalyFlags && result.decision.anomalyFlags.length > 0;

        // High priority: low confidence, high amount, or anomalies
        if (confidence < 0.6 || amount > 10000 || hasAnomalies) {
            return 'high';
        }

        // Medium priority: moderate confidence or moderate amount
        if (confidence < 0.8 || amount > 1000) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Estimate review time based on complexity
     */
    private estimateReviewTime(result: ProcessingResult): number {
        const baseTime = 2; // 2 minutes base
        const { confidence } = result.decision;

        // Lower confidence = more time needed
        const confidenceAdjustment = (1 - confidence) * 5;

        // More alternatives = more time
        const alternativesCount = result.decision.predictions.length;
        const alternativesAdjustment = alternativesCount * 0.5;

        return Math.round(baseTime + confidenceAdjustment + alternativesAdjustment);
    }

    /**
     * Sort queue by priority and age
     */
    private sortQueue(): void {
        const priorityOrder = { high: 0, medium: 1, low: 2 };

        this.reviewQueue.sort((a, b) => {
            // First by priority
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Then by age (older first)
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
    }

    /**
     * Update thresholds
     */
    updateThresholds(thresholds: Partial<ConfidenceThresholds>): void {
        this.thresholds = { ...this.thresholds, ...thresholds };
    }

    /**
     * Get current thresholds
     */
    getThresholds(): ConfidenceThresholds {
        return { ...this.thresholds };
    }
}
