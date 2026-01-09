/**
 * Services Module Exports
 */

export { AnomalyDetector } from './anomaly-detector.js';
export { TransactionProcessor, type ProcessorStats, type BatchProcessingResult } from './transaction-processor.js';
export {
    MonthEndCloseService,
    type CloseChecklist,
    type CloseChecklistItem,
    type ReconciliationResult,
    type VarianceAnalysis,
    type JournalEntrySuggestion,
} from './month-end-close.js';
export {
    ReconciliationEngine,
    type ReconciliationSession,
    type ReconciliationSource,
    type ReconciliationTransaction,
    type MatchResult,
    type Discrepancy,
    type MatchingRule,
} from './reconciliation-engine.js';
export {
    HybridSearchEngine,
    hybridSearch,
    type SearchResult,
    type SearchOptions,
    type SearchMetadata,
    type IndexType,
} from './hybrid-search.js';
export {
    CitationTracker,
    citationTracker,
    type Citation,
    type CitationSource,
    type CitationSummary,
    type FormattedResponse,
} from './citation-tracker.js';
