/**
 * Unit Tests for AI Engine
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    PrismaAgentEngine,
    ConfidenceRouter,
    TrainingPipeline,
    AnomalyDetector,
    TransactionProcessor,
    DEFAULT_THRESHOLDS,
    type RawTransaction,
    type ProcessingResult,
} from '../src/index.js';

// ============================================================================
// AGENT ENGINE TESTS
// ============================================================================

describe('PrismaAgentEngine', () => {
    let engine: PrismaAgentEngine;

    beforeEach(() => {
        engine = new PrismaAgentEngine();
    });

    it('should initialize with default config', () => {
        const config = engine.getConfig();
        expect(config.thresholds).toEqual(DEFAULT_THRESHOLDS);
        expect(config.models.precision.enabled).toBe(true);
        expect(config.models.predictive.enabled).toBe(true);
        expect(config.models.anomaly.enabled).toBe(true);
    });

    it('should process transaction and return result', async () => {
        const tx: RawTransaction = {
            id: 'test-tx-001',
            type: 'invoice',
            date: new Date(),
            amount: 1500,
            currency: 'USD',
            description: 'AWS Monthly Services',
            vendor: 'Amazon Web Services',
        };

        const result = await engine.processTransaction(tx);

        expect(result.success).toBe(true);
        expect(result.transaction.id).toBe('test-tx-001');
        expect(result.decision).toBeDefined();
        expect(result.decision.category).toBeDefined();
        expect(result.decision.confidence).toBeGreaterThanOrEqual(0);
        expect(result.decision.confidence).toBeLessThanOrEqual(1);
    });

    it('should route high confidence to auto', async () => {
        // Precision model should match 'aws' pattern with high confidence
        const tx: RawTransaction = {
            id: 'test-tx-002',
            type: 'payment',
            date: new Date(),
            amount: 50,
            currency: 'USD',
            description: 'AWS Lambda charges',
            vendor: 'AWS',
        };

        const result = await engine.processTransaction(tx);

        // With 'aws' in vendor, precision model should match
        expect(result.success).toBe(true);
        expect(result.decision.category).toBe('Cloud Services');
    });

    it('should update config', () => {
        engine.updateConfig({
            thresholds: {
                autoProcess: 0.90,
                humanReview: 0.70,
                reject: 0.70,
            },
        });

        const config = engine.getConfig();
        expect(config.thresholds.autoProcess).toBe(0.90);
        expect(config.thresholds.humanReview).toBe(0.70);
    });
});

// ============================================================================
// CONFIDENCE ROUTER TESTS
// ============================================================================

describe('ConfidenceRouter', () => {
    let router: ConfidenceRouter;

    beforeEach(() => {
        router = new ConfidenceRouter();
    });

    it('should route high confidence to auto', () => {
        const result: ProcessingResult = {
            success: true,
            transaction: {} as any,
            decision: {
                category: 'Office Supplies',
                confidence: 0.96,
                route: 'auto',
                reasoning: 'High confidence match',
                predictions: [],
            },
        };

        const decision = router.route(result);
        expect(decision.route).toBe('auto');
    });

    it('should route medium confidence to human-review', () => {
        const result: ProcessingResult = {
            success: true,
            transaction: {} as any,
            decision: {
                category: 'Professional Services',
                confidence: 0.85,
                route: 'human-review',
                reasoning: 'Medium confidence',
                predictions: [],
            },
        };

        const decision = router.route(result);
        expect(decision.route).toBe('human-review');
    });

    it('should route low confidence to reject', () => {
        const result: ProcessingResult = {
            success: true,
            transaction: {} as any,
            decision: {
                category: 'Uncategorized',
                confidence: 0.50,
                route: 'reject',
                reasoning: 'Low confidence',
                predictions: [],
            },
        };

        const decision = router.route(result);
        expect(decision.route).toBe('reject');
    });

    it('should manage review queue', () => {
        const result: ProcessingResult = {
            success: true,
            transaction: { id: 'tx-123' } as any,
            decision: {
                category: 'Unknown',
                confidence: 0.85,
                route: 'human-review',
                reasoning: 'Needs review',
                predictions: [],
            },
        };

        const item = router.enqueueForReview(result);
        expect(item.transactionId).toBe('tx-123');
        expect(item.status).toBe('pending');

        const pending = router.getPendingReviews();
        expect(pending.length).toBe(1);

        router.completeReview(item.id, true);
        const completed = router.getQueueStats();
        expect(completed.completed).toBe(1);
    });
});

// ============================================================================
// TRAINING PIPELINE TESTS
// ============================================================================

describe('TrainingPipeline', () => {
    let pipeline: TrainingPipeline;

    beforeEach(() => {
        pipeline = new TrainingPipeline({ retrainThreshold: 5 });
    });

    it('should record corrections', () => {
        pipeline.recordCorrection(
            { id: 'tx-1', vendorNormalized: 'acme' } as any,
            {
                transactionId: 'tx-1',
                userId: 'user-1',
                feedbackType: 'category',
                originalValue: 'Office Supplies',
                correctedValue: 'Marketing',
                originalConfidence: 0.8,
                timestamp: new Date(),
            }
        );

        const stats = pipeline.getStats();
        expect(stats.totalDataPoints).toBe(1);
        expect(stats.correctionCount).toBe(1);
    });

    it('should record confirmations', () => {
        pipeline.recordConfirmation(
            { id: 'tx-2', vendorNormalized: 'acme' } as any,
            'Office Supplies',
            'user-1'
        );

        const stats = pipeline.getStats();
        expect(stats.confirmationCount).toBe(1);
    });

    it('should track category distribution', () => {
        pipeline.recordCorrection(
            { id: 'tx-1', vendorNormalized: 'a' } as any,
            { correctedValue: 'Marketing', userId: 'u1', feedbackType: 'category', originalValue: '', originalConfidence: 0, transactionId: 'tx-1', timestamp: new Date() }
        );
        pipeline.recordCorrection(
            { id: 'tx-2', vendorNormalized: 'b' } as any,
            { correctedValue: 'Marketing', userId: 'u1', feedbackType: 'category', originalValue: '', originalConfidence: 0, transactionId: 'tx-2', timestamp: new Date() }
        );
        pipeline.recordCorrection(
            { id: 'tx-3', vendorNormalized: 'c' } as any,
            { correctedValue: 'Sales', userId: 'u1', feedbackType: 'category', originalValue: '', originalConfidence: 0, transactionId: 'tx-3', timestamp: new Date() }
        );

        const stats = pipeline.getStats();
        expect(stats.categoryDistribution['Marketing']).toBe(2);
        expect(stats.categoryDistribution['Sales']).toBe(1);
    });
});

// ============================================================================
// ANOMALY DETECTOR TESTS
// ============================================================================

describe('AnomalyDetector', () => {
    let detector: AnomalyDetector;

    beforeEach(() => {
        detector = new AnomalyDetector({ zScoreThreshold: 3 });
    });

    it('should detect point anomalies', async () => {
        const transactions = [
            { id: '1', amount: 100, vendor: 'A', vendorNormalized: 'a', date: new Date() },
            { id: '2', amount: 110, vendor: 'B', vendorNormalized: 'b', date: new Date() },
            { id: '3', amount: 95, vendor: 'C', vendorNormalized: 'c', date: new Date() },
            { id: '4', amount: 10000, vendor: 'D', vendorNormalized: 'd', date: new Date() }, // Outlier
        ] as any[];

        const report = await detector.detectAnomalies(transactions);

        expect(report.anomalies.point.length).toBeGreaterThan(0);
        expect(report.anomalies.point[0].transactionId).toBe('4');
        expect(report.anomalies.point[0].severity).toBe('critical');
    });

    it('should detect weekend transactions as contextual anomalies', async () => {
        const saturday = new Date('2026-01-10T14:00:00'); // Saturday
        const transactions = [
            { id: '1', amount: 100, vendor: 'A', vendorNormalized: 'a', date: saturday },
        ] as any[];

        const report = await detector.detectAnomalies(transactions);

        const weekendAnomaly = report.anomalies.contextual.find(
            a => a.description.includes('weekend')
        );
        expect(weekendAnomaly).toBeDefined();
        expect(weekendAnomaly?.severity).toBe('low');
    });

    it('should calculate overall risk score', async () => {
        const transactions = [
            { id: '1', amount: 100, vendor: 'A', vendorNormalized: 'a', date: new Date() },
        ] as any[];

        const report = await detector.detectAnomalies(transactions);

        expect(report.riskScore).toBeDefined();
        expect(report.riskScore).toBeGreaterThanOrEqual(0);
        expect(report.riskScore).toBeLessThanOrEqual(100);
    });

    it('should generate recommendations', async () => {
        const transactions = [
            { id: '1', amount: 100, vendor: 'A', vendorNormalized: 'a', date: new Date() },
        ] as any[];

        const report = await detector.detectAnomalies(transactions);

        expect(Array.isArray(report.recommendations)).toBe(true);
        expect(report.recommendations.length).toBeGreaterThan(0);
    });
});

// ============================================================================
// TRANSACTION PROCESSOR TESTS
// ============================================================================

describe('TransactionProcessor', () => {
    let processor: TransactionProcessor;

    beforeEach(() => {
        processor = new TransactionProcessor();
    });

    it('should process single transaction', async () => {
        const tx: RawTransaction = {
            id: 'test-001',
            type: 'invoice',
            date: new Date(),
            amount: 500,
            currency: 'USD',
            description: 'Office supplies from Staples',
        };

        const result = await processor.process(tx);

        expect(result.success).toBe(true);
        expect(result.transaction.id).toBe('test-001');
    });

    it('should track processing stats', async () => {
        const tx: RawTransaction = {
            id: 'test-002',
            type: 'payment',
            date: new Date(),
            amount: 100,
            currency: 'USD',
            description: 'Test payment',
        };

        await processor.process(tx);

        const stats = processor.getStats();
        expect(stats.totalProcessed).toBe(1);
        expect(stats.avgConfidence).toBeGreaterThanOrEqual(0);
        expect(stats.avgProcessingTimeMs).toBeGreaterThan(0);
    });

    it('should process batch of transactions', async () => {
        const transactions: RawTransaction[] = [
            { id: 'batch-1', type: 'invoice', date: new Date(), amount: 100, currency: 'USD', description: 'Item 1' },
            { id: 'batch-2', type: 'invoice', date: new Date(), amount: 200, currency: 'USD', description: 'Item 2' },
            { id: 'batch-3', type: 'invoice', date: new Date(), amount: 300, currency: 'USD', description: 'Item 3' },
        ];

        const result = await processor.processBatch(transactions, { concurrency: 2 });

        expect(result.stats.total).toBe(3);
        expect(result.stats.succeeded).toBe(3);
        expect(result.processed.length).toBe(3);
    });

    it('should parse bank feed entries', () => {
        const entry = {
            id: 'bank-001',
            date: '2026-01-09',
            amount: -150.50,
            description: 'AMAZON PRIME MEMBERSHIP',
            type: 'debit' as const,
            accountId: 'acc-123',
        };

        const tx = processor.parseBankFeed(entry);

        expect(tx.id).toBe('bank-001');
        expect(tx.amount).toBe(150.50); // Absolute value
        expect(tx.type).toBe('payment');
    });
});
