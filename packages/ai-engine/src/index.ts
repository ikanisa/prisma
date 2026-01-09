/**
 * @prisma/ai-engine
 * 
 * Unified AI engine for autonomous transaction processing, anomaly detection,
 * and intelligent categorization. Built for accounting/audit applications.
 * 
 * @example
 * ```typescript
 * import { TransactionProcessor, AnomalyDetector } from '@prisma/ai-engine';
 * 
 * const processor = new TransactionProcessor();
 * const result = await processor.process({
 *   id: 'tx-123',
 *   type: 'invoice',
 *   amount: 1500,
 *   currency: 'USD',
 *   description: 'AWS Monthly',
 *   date: new Date(),
 * });
 * 
 * if (result.decision.route === 'auto') {
 *   console.log(`Auto-processed: ${result.decision.category}`);
 * }
 * ```
 */

// Core exports
export {
    PrismaAgentEngine,
    ConfidenceRouter,
    TrainingPipeline,
    type RouteDecision,
    type ReviewQueueItem,
    type TrainingStats,
    type RetrainJob,
} from './core/index.js';

// Services exports
export {
    AnomalyDetector,
    TransactionProcessor,
    type ProcessorStats,
    type BatchProcessingResult,
} from './services/index.js';

// Type exports
export {
    // Transaction types
    type RawTransaction,
    type NormalizedTransaction,
    type ProcessedTransaction,
    type TransactionType,
    TransactionTypeSchema,

    // Prediction types
    type Prediction,
    type AgentDecision,
    type ProcessingRoute,
    type ProcessingResult,

    // Anomaly types
    type Anomaly,
    type AnomalyReport,
    type AnomalyType,
    AnomalyTypeSchema,
    type Severity,
    SeveritySchema,

    // Feedback & learning
    type UserFeedback,
    type TrainingDataPoint,

    // Model performance
    type ModelMetrics,
    type ConfusionMatrixEntry,

    // Configuration
    type AIEngineConfig,
    type ConfidenceThresholds,
    DEFAULT_CONFIG,
    DEFAULT_THRESHOLDS,
} from './types.js';
