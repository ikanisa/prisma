/**
 * AI Engine Type Definitions
 * 
 * Core types for autonomous transaction processing, anomaly detection,
 * and confidence-based routing.
 */

import { z } from 'zod';

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export const TransactionTypeSchema = z.enum([
    'bank_feed',
    'invoice',
    'receipt',
    'journal_entry',
    'payment',
    'transfer',
    'adjustment'
]);

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export interface RawTransaction {
    id: string;
    type: TransactionType;
    date: Date;
    amount: number;
    currency: string;
    description: string;
    vendor?: string;
    reference?: string;
    metadata?: Record<string, unknown>;
    document?: {
        id: string;
        url: string;
        mimeType: string;
    };
}

export interface NormalizedTransaction {
    id: string;
    type: TransactionType;
    date: Date;
    amount: number;
    currency: string;
    description: string;
    vendor: string;
    vendorNormalized: string;
    reference?: string;
    lineItems?: Array<{
        description: string;
        amount: number;
        category?: string;
    }>;
    extractedData?: Record<string, unknown>;
}

export interface ProcessedTransaction extends NormalizedTransaction {
    category: string;
    categoryConfidence: number;
    suggestedAccount?: string;
    accountConfidence?: number;
    autoProcessed: boolean;
    humanReviewed: boolean;
    processingTimeMs: number;
    modelUsed: string;
    reasoning?: string;
}

// ============================================================================
// PREDICTION TYPES
// ============================================================================

export interface Prediction {
    category: string;
    confidence: number;
    model: 'precision' | 'predictive' | 'anomaly';
    reasoning?: string;
    alternativeCategories?: Array<{
        category: string;
        confidence: number;
    }>;
}

export interface AgentDecision {
    category: string;
    confidence: number;
    route: ProcessingRoute;
    reasoning: string;
    predictions: Prediction[];
    anomalyFlags?: string[];
}

export type ProcessingRoute = 'auto' | 'human-review' | 'reject';

// ============================================================================
// ANOMALY TYPES
// ============================================================================

export const AnomalyTypeSchema = z.enum([
    'point',      // Statistical outlier
    'contextual', // Unusual for context (time, vendor, etc.)
    'collective'  // Part of suspicious pattern/scheme
]);

export type AnomalyType = z.infer<typeof AnomalyTypeSchema>;

export const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type Severity = z.infer<typeof SeveritySchema>;

export interface Anomaly {
    id: string;
    type: AnomalyType;
    transactionId: string;
    severity: Severity;
    riskScore: number;
    description: string;
    reason: string;
    recommendedAction?: string;
    relatedTransactions?: string[];
}

export interface AnomalyReport {
    anomalies: {
        point: Anomaly[];
        contextual: Anomaly[];
        collective: Anomaly[];
    };
    totalCount: number;
    riskScore: number;
    recommendations: string[];
    generatedAt: Date;
}

// ============================================================================
// USER FEEDBACK & LEARNING
// ============================================================================

export interface UserFeedback {
    transactionId: string;
    userId: string;
    feedbackType: 'category' | 'amount' | 'vendor' | 'account' | 'other';
    originalValue: string;
    correctedValue: string;
    originalConfidence: number;
    timestamp: Date;
    notes?: string;
}

export interface TrainingDataPoint {
    input: NormalizedTransaction;
    output: {
        category: string;
        account?: string;
    };
    source: 'correction' | 'confirmation' | 'manual';
    userId: string;
    timestamp: Date;
}

// ============================================================================
// MODEL PERFORMANCE
// ============================================================================

export interface ModelMetrics {
    modelType: 'precision' | 'predictive' | 'anomaly' | 'ensemble';
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    avgConfidence: number;
    autoProcessRate: number;
    correctionRate: number;
    processingTimeMs: {
        p50: number;
        p95: number;
        p99: number;
    };
    sampleSize: number;
    period: {
        start: Date;
        end: Date;
    };
}

export interface ConfusionMatrixEntry {
    actual: string;
    predicted: string;
    count: number;
}

// ============================================================================
// PROCESSING RESULT
// ============================================================================

export interface ProcessingResult {
    success: boolean;
    transaction: ProcessedTransaction;
    decision: AgentDecision;
    anomalies?: Anomaly[];
    errors?: Array<{
        code: string;
        message: string;
    }>;
}

// ============================================================================
// CONFIDENCE THRESHOLDS
// ============================================================================

export const DEFAULT_THRESHOLDS = {
    autoProcess: 0.95,    // Auto-process if 95%+ confident
    humanReview: 0.80,    // Human review if 80-95%
    reject: 0.80,         // Flag for manual if <80%
} as const;

export interface ConfidenceThresholds {
    autoProcess: number;
    humanReview: number;
    reject: number;
}

// ============================================================================
// ENGINE CONFIGURATION
// ============================================================================

export interface AIEngineConfig {
    thresholds: ConfidenceThresholds;
    models: {
        precision: {
            enabled: boolean;
            weight: number;
        };
        predictive: {
            enabled: boolean;
            weight: number;
            model: string;  // e.g., 'gpt-4'
        };
        anomaly: {
            enabled: boolean;
            weight: number;
            zScoreThreshold: number;
        };
    };
    learning: {
        enabled: boolean;
        retrainThreshold: number;  // Number of corrections before retrain
        minConfidenceForLearning: number;
    };
}

export const DEFAULT_CONFIG: AIEngineConfig = {
    thresholds: DEFAULT_THRESHOLDS,
    models: {
        precision: {
            enabled: true,
            weight: 0.5,
        },
        predictive: {
            enabled: true,
            weight: 0.3,
            model: 'gpt-4',
        },
        anomaly: {
            enabled: true,
            weight: 0.2,
            zScoreThreshold: 3,
        },
    },
    learning: {
        enabled: true,
        retrainThreshold: 100,
        minConfidenceForLearning: 0.5,
    },
};
