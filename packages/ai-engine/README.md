# @prisma/ai-engine

Unified AI engine for autonomous transaction processing, anomaly detection, and intelligent categorization.

## Features

- **Multi-Model Pipeline**: Combines precision (pattern matching), predictive (GPT-4), and anomaly detection models
- **Confidence-Based Routing**: Auto-process (95%+), human review (80-95%), or manual entry (<80%)
- **MindBridge-Style Anomaly Detection**: Point, contextual, and collective anomaly detection
- **Continuous Learning**: Learns from user corrections to improve over time
- **Batch Processing**: Efficiently process multiple transactions

## Installation

```bash
pnpm add @prisma/ai-engine
```

## Usage

```typescript
import { TransactionProcessor } from '@prisma/ai-engine';

const processor = new TransactionProcessor();

// Process a single transaction
const result = await processor.process({
  id: 'tx-123',
  type: 'invoice',
  amount: 1500,
  currency: 'USD',
  description: 'AWS Monthly Services',
  vendor: 'Amazon Web Services',
  date: new Date(),
});

console.log(`Category: ${result.decision.category}`);
console.log(`Confidence: ${result.decision.confidence * 100}%`);
console.log(`Route: ${result.decision.route}`);

// Check for anomalies
if (result.anomalies?.length) {
  console.log('Anomalies detected:', result.anomalies);
}
```

## API

### TransactionProcessor

Main entry point for processing transactions.

```typescript
const processor = new TransactionProcessor();

// Process single
const result = await processor.process(transaction);

// Process batch
const batchResult = await processor.processBatch(transactions, { concurrency: 5 });

// Get stats
const stats = processor.getStats();

// Get pending reviews
const pending = processor.getPendingReviews(20);

// Complete a review
await processor.completeReview(itemId, approved, correctedCategory);
```

### AnomalyDetector

Standalone anomaly detection.

```typescript
import { AnomalyDetector } from '@prisma/ai-engine';

const detector = new AnomalyDetector();
const report = await detector.detectAnomalies(transactions);

console.log(`Total anomalies: ${report.totalCount}`);
console.log(`Risk score: ${report.riskScore}`);
console.log(`Recommendations:`, report.recommendations);
```

### PrismaAgentEngine

Core AI engine with multi-model pipeline.

```typescript
import { PrismaAgentEngine } from '@prisma/ai-engine';

const engine = new PrismaAgentEngine({
  thresholds: {
    autoProcess: 0.95,
    humanReview: 0.80,
    reject: 0.80,
  },
  models: {
    precision: { enabled: true, weight: 0.5 },
    predictive: { enabled: true, weight: 0.3, model: 'gpt-4' },
    anomaly: { enabled: true, weight: 0.2, zScoreThreshold: 3 },
  },
});

const result = await engine.processTransaction(transaction);
```

## Confidence Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| Auto-Process | 95%+ | Transaction is automatically categorized |
| Human Review | 80-95% | Queued for user verification |
| Reject | <80% | Requires manual entry |

## Anomaly Types

| Type | Description |
|------|-------------|
| Point | Statistical outliers (z-score > 3) |
| Contextual | Unusual for context (timing, vendor patterns) |
| Collective | Suspicious patterns (duplicates, splitting) |

## Industry Benchmarks

Based on market research of leading AI accounting systems:

| Metric | Target | Benchmark |
|--------|--------|-----------|
| Auto-Process Rate | 95% | Docyt: 95%, Digits: 95% |
| Accuracy | 98% | Digits: 97.8%, Vic.ai: 99% |
| Processing Time | <2s | Digits: 0.04s |
