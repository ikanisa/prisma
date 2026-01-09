/**
 * Training Pipeline
 * 
 * Collects user corrections and confirmations for model retraining.
 * Implements continuous learning from feedback.
 */

import {
    type UserFeedback,
    type TrainingDataPoint,
    type NormalizedTransaction,
} from '../types.js';

export interface TrainingStats {
    totalDataPoints: number;
    correctionCount: number;
    confirmationCount: number;
    categoryDistribution: Record<string, number>;
    lastUpdated: Date;
    readyForRetrain: boolean;
}

export interface RetrainJob {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    dataPointCount: number;
    startedAt?: Date;
    completedAt?: Date;
    accuracy?: number;
    error?: string;
}

export class TrainingPipeline {
    private dataPoints: TrainingDataPoint[] = [];
    private retrainThreshold: number;
    private minDataPoints: number;
    private retrainJobs: RetrainJob[] = [];

    constructor(options: {
        retrainThreshold?: number;
        minDataPoints?: number;
    } = {}) {
        this.retrainThreshold = options.retrainThreshold ?? 100;
        this.minDataPoints = options.minDataPoints ?? 50;
    }

    /**
     * Record a user correction
     */
    recordCorrection(
        transaction: NormalizedTransaction,
        feedback: UserFeedback
    ): void {
        this.dataPoints.push({
            input: transaction,
            output: {
                category: feedback.correctedValue,
            },
            source: 'correction',
            userId: feedback.userId,
            timestamp: new Date(),
        });

        this.checkRetrainTrigger();
    }

    /**
     * Record a user confirmation (approved AI suggestion)
     */
    recordConfirmation(
        transaction: NormalizedTransaction,
        category: string,
        userId: string
    ): void {
        this.dataPoints.push({
            input: transaction,
            output: { category },
            source: 'confirmation',
            userId,
            timestamp: new Date(),
        });

        this.checkRetrainTrigger();
    }

    /**
     * Record manual entry
     */
    recordManualEntry(
        transaction: NormalizedTransaction,
        category: string,
        userId: string
    ): void {
        this.dataPoints.push({
            input: transaction,
            output: { category },
            source: 'manual',
            userId,
            timestamp: new Date(),
        });

        this.checkRetrainTrigger();
    }

    /**
     * Get training statistics
     */
    getStats(): TrainingStats {
        const categoryDistribution: Record<string, number> = {};

        for (const dp of this.dataPoints) {
            const cat = dp.output.category;
            categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
        }

        return {
            totalDataPoints: this.dataPoints.length,
            correctionCount: this.dataPoints.filter(d => d.source === 'correction').length,
            confirmationCount: this.dataPoints.filter(d => d.source === 'confirmation').length,
            categoryDistribution,
            lastUpdated: this.dataPoints.length > 0
                ? this.dataPoints[this.dataPoints.length - 1].timestamp
                : new Date(),
            readyForRetrain: this.dataPoints.length >= this.retrainThreshold,
        };
    }

    /**
     * Get data points for training
     */
    getTrainingData(since?: Date): TrainingDataPoint[] {
        if (since) {
            return this.dataPoints.filter(d => d.timestamp >= since);
        }
        return [...this.dataPoints];
    }

    /**
     * Export training data in format suitable for fine-tuning
     */
    exportForFineTuning(): Array<{
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    }> {
        return this.dataPoints.map(dp => ({
            messages: [
                {
                    role: 'system' as const,
                    content: 'You are an expert accountant categorizing financial transactions.',
                },
                {
                    role: 'user' as const,
                    content: `Categorize: ${dp.input.vendor} - ${dp.input.description} - ${dp.input.amount} ${dp.input.currency}`,
                },
                {
                    role: 'assistant' as const,
                    content: JSON.stringify({ category: dp.output.category, confidence: 0.95 }),
                },
            ],
        }));
    }

    /**
     * Trigger model retrain
     */
    async triggerRetrain(): Promise<RetrainJob> {
        const job: RetrainJob = {
            id: crypto.randomUUID(),
            status: 'pending',
            dataPointCount: this.dataPoints.length,
        };

        this.retrainJobs.push(job);

        // In production, this would trigger actual model retraining
        // For now, we simulate the process
        job.status = 'running';
        job.startedAt = new Date();

        // Simulate training (in production, this would be async)
        setTimeout(() => {
            job.status = 'completed';
            job.completedAt = new Date();
            job.accuracy = 0.95 + Math.random() * 0.04; // Simulated 95-99% accuracy
        }, 1000);

        return job;
    }

    /**
     * Get retrain job status
     */
    getRetrainJob(jobId: string): RetrainJob | null {
        return this.retrainJobs.find(j => j.id === jobId) || null;
    }

    /**
     * Get all retrain jobs
     */
    getRetrainJobs(): RetrainJob[] {
        return [...this.retrainJobs];
    }

    /**
     * Clear old data points after successful retrain
     */
    clearProcessedData(beforeDate: Date): number {
        const before = this.dataPoints.length;
        this.dataPoints = this.dataPoints.filter(d => d.timestamp >= beforeDate);
        return before - this.dataPoints.length;
    }

    /**
     * Check if retrain should be triggered
     */
    private checkRetrainTrigger(): void {
        if (this.dataPoints.length >= this.retrainThreshold) {
            console.log(`[Training Pipeline] Retrain threshold reached (${this.dataPoints.length} data points)`);
            // In production, this would emit an event or trigger the retrain job
        }
    }

    /**
     * Get category accuracy from corrections
     */
    getCategoryAccuracy(): Record<string, { correct: number; incorrect: number; accuracy: number }> {
        const stats: Record<string, { correct: number; incorrect: number }> = {};

        for (const dp of this.dataPoints) {
            const cat = dp.output.category;
            if (!stats[cat]) {
                stats[cat] = { correct: 0, incorrect: 0 };
            }

            if (dp.source === 'confirmation') {
                stats[cat].correct++;
            } else if (dp.source === 'correction') {
                stats[cat].incorrect++;
            }
        }

        const result: Record<string, { correct: number; incorrect: number; accuracy: number }> = {};
        for (const [cat, data] of Object.entries(stats)) {
            const total = data.correct + data.incorrect;
            result[cat] = {
                ...data,
                accuracy: total > 0 ? data.correct / total : 0,
            };
        }

        return result;
    }
}
