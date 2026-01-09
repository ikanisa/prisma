/**
 * Deep Search + Curated Knowledge Base + Retrieval Guardrails
 *
 * This module exports the complete AI agent knowledge management system:
 *
 * 1. Curated Knowledge Base (CKB) - Structured library of standards, definitions, and examples
 * 2. Deep Search - Authoritative source retrieval from IFRS, IAASB, OECD, tax authorities
 * 3. Retrieval Guardrails - Validation rules to prevent hallucination and ensure accuracy
 *
 * The system follows a layered access model:
 * - Layer 1: Native LLM memory (not trusted as final reference)
 * - Layer 2: Verified Knowledge Base (RAG with citations)
 * - Layer 3: Deep Search (triggered when sources are missing/outdated)
 * - Layer 4: Reasoning Validators (evaluate sources, detect conflicts)
 */

// Type exports
export type {
  // Enums and standard types
  KnowledgeStandardType,
  KnowledgeVerificationLevel,
  KnowledgeSourcePriority,
  DeepSearchSourceType,
  GuardrailRuleType,
  GuardrailAction,

  // Curated Knowledge Base types
  CuratedKnowledgeEntry,
  CreateKnowledgeEntryRequest,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,

  // Deep Search types
  DeepSearchSource,
  DeepSearchRequest,
  DeepSearchResult,
  DeepSearchResponse,

  // Guardrail types
  RetrievalGuardrail,
  GuardrailCheckRequest,
  GuardrailCheckResponse,
  GuardrailEvaluationResult,

  // Reasoning trace types
  ReasoningStep,
  AgentReasoningTrace,
  CreateReasoningTraceRequest,

  // Agent knowledge access types
  NativeMemoryLayer,
  VerifiedKnowledgeLayer,
  DeepSearchLayer,
  ReasoningValidatorLayer,
  AgentKnowledgeAccess,

  // Utility types
  Citation,
  KnowledgeConflict,
} from './types/curated-knowledge-base.js';

// Curated Knowledge Base service
export {
  createKnowledgeEntry,
  getKnowledgeEntry,
  searchKnowledgeBase,
  updateUsageStats,
  markAsOutdated,
  logReasoningTrace,
  getReasoningTracesForReview,
  reviewReasoningTrace,
  getEntriesByStandardType,
  seedIFRSStandards,
  getKnowledgeBaseStats,
} from './curated-knowledge-base.js';

// Deep Search service
export {
  AUTHORITATIVE_DOMAINS,
  getAuthoritativeDomains,
  getDeepSearchSources,
  shouldTriggerDeepSearch,
  performDeepSearch,
  mergeWithCKBResults,
  logDeepSearchExecution,
} from './deep-search.js';

// Retrieval Guardrails service
export {
  loadGuardrails,
  checkGuardrails,
  getDisclaimers,
  formatGuardrailAuditLog,
} from './retrieval-guardrails.js';

// Vector utilities
export { vector, embed_chunks } from './vector.js';
