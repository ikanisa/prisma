/**
 * Curated Knowledge Base (CKB) Types
 * Deep Search + Curated Knowledge Base + Retrieval Guardrails
 *
 * Implements the structured knowledge architecture for AI agent learning
 * with authoritative sources, verification levels, and metadata tracking.
 */

// ============================================
// ENUMS
// ============================================

/**
 * Standard/Document types following the problem statement categories
 */
export type KnowledgeStandardType =
  | 'IFRS' // International Financial Reporting Standards
  | 'IAS' // International Accounting Standards
  | 'IFRIC' // IFRS Interpretations Committee
  | 'ISA' // International Standards on Auditing
  | 'GAAP' // Generally Accepted Accounting Principles
  | 'TAX_LAW' // Tax legislation
  | 'ACCA' // ACCA study materials and guidance
  | 'CPA' // CPA materials and guidance
  | 'OECD' // OECD guidelines (BEPS, international tax)
  | 'INTERNAL' // Company-specific internal policies
  | 'SECONDARY' // Big Four summaries, university notes
  | 'REGULATORY' // National regulatory publications
  | 'CASE_STUDY' // Worked examples and case studies
  | 'TEMPLATE' // Standard templates and forms
  | 'CALCULATOR'; // Formula models and calculators

/**
 * Verification levels (primary sources override secondary)
 */
export type KnowledgeVerificationLevel =
  | 'primary' // Authoritative primary sources (IFRS, ISA, tax laws)
  | 'secondary' // Interpretation materials (Big Four, ACCA)
  | 'tertiary'; // Internal policies, templates

/**
 * Source priority for conflict resolution
 */
export type KnowledgeSourcePriority =
  | 'authoritative' // Cannot be overridden
  | 'regulatory' // Local law overrides global in tax matters
  | 'interpretive' // Can be cited but not as final authority
  | 'supplementary'; // Background/context only

/**
 * Deep Search source types
 */
export type DeepSearchSourceType =
  | 'ifrs_foundation' // IFRS Foundation
  | 'iaasb' // International Auditing and Assurance Standards Board
  | 'acca' // ACCA materials
  | 'cpa' // CPA resources
  | 'oecd' // OECD guidelines
  | 'tax_authority' // National tax authorities
  | 'gaap' // Local GAAP documents
  | 'gazette' // National gazettes and public statutes
  | 'regulatory_pdf' // Regulatory PDF ingestion
  | 'company_policy' // Company-specific internal policies
  | 'big_four' // Big Four summaries (secondary)
  | 'academic'; // University/academic materials (secondary)

/**
 * Retrieval guardrail rule types
 */
export type GuardrailRuleType =
  | 'source_verification' // Verify sources match question
  | 'conflict_resolution' // Handle source conflicts
  | 'jurisdiction_check' // Verify jurisdiction requirements
  | 'outdated_check' // Flag potentially outdated info
  | 'citation_required' // Require citations for certain topics
  | 'escalation_trigger' // Trigger human review
  | 'confidence_threshold' // Minimum confidence requirement
  | 'deep_search_trigger'; // When to trigger Deep Search

/**
 * Guardrail violation actions
 */
export type GuardrailAction =
  | 'block' // Block the response
  | 'warn' // Add warning to response
  | 'escalate' // Escalate to human
  | 'deep_search' // Trigger Deep Search
  | 'add_disclaimer' // Add disclaimer
  | 'log_only'; // Log for audit

// ============================================
// CURATED KNOWLEDGE BASE TYPES
// ============================================

/**
 * Curated Knowledge Base entry
 */
export interface CuratedKnowledgeEntry {
  id: string;
  organizationId: string | null;

  // Identity
  title: string;
  slug: string;
  sectionKey?: string; // Hierarchical key like "IAS 21.9", "ISA 540.12"

  // Classification
  standardType: KnowledgeStandardType;
  verificationLevel: KnowledgeVerificationLevel;
  sourcePriority: KnowledgeSourcePriority;

  // Jurisdiction & Scope
  jurisdiction: string[]; // ISO codes: 'INTL', 'MT', 'RW', 'US', etc.
  effectiveDate?: string;
  expiryDate?: string;
  version?: string;

  // Content
  summary?: string;
  fullText: string;

  // Source Attribution
  sourceUrl?: string;
  sourceDocumentId?: string;

  // Metadata & Tags
  tags: string[]; // e.g., 'IFRS 3', 'IAS 21', 'Rwanda VAT 2023'
  domain?: string; // e.g., 'financial_reporting', 'audit', 'tax'
  metadata: Record<string, unknown>;

  // Quality & Usage
  usageCount: number;
  citationCount: number;
  lastCitedAt?: string;
  qualityScore?: number;

  // Lifecycle
  isActive: boolean;
  isOutdated: boolean;
  supersededBy?: string;

  // Audit Trail
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create CKB entry request
 */
export interface CreateKnowledgeEntryRequest {
  title: string;
  slug?: string;
  sectionKey?: string;
  standardType: KnowledgeStandardType;
  verificationLevel?: KnowledgeVerificationLevel;
  sourcePriority?: KnowledgeSourcePriority;
  jurisdiction?: string[];
  effectiveDate?: string;
  expiryDate?: string;
  version?: string;
  summary?: string;
  fullText: string;
  sourceUrl?: string;
  tags?: string[];
  domain?: string;
  metadata?: Record<string, unknown>;
}

/**
 * CKB search result
 */
export interface KnowledgeSearchResult {
  knowledgeId: string;
  title: string;
  sectionKey?: string;
  summary?: string;
  fullText: string;
  standardType: KnowledgeStandardType;
  verificationLevel: KnowledgeVerificationLevel;
  sourcePriority: KnowledgeSourcePriority;
  jurisdiction: string[];
  tags: string[];
  sourceUrl?: string;
  similarityScore: number;
  isOutdated: boolean;
}

/**
 * CKB search request
 */
export interface KnowledgeSearchRequest {
  query: string;
  jurisdictions?: string[];
  domains?: string[];
  standardTypes?: KnowledgeStandardType[];
  limit?: number;
  minSimilarity?: number;
}

// ============================================
// DEEP SEARCH TYPES
// ============================================

/**
 * Deep Search authoritative source
 */
export interface DeepSearchSource {
  id: string;
  name: string;
  description?: string;
  sourceType: DeepSearchSourceType;
  baseUrl?: string;
  apiEndpoint?: string;
  requiresAuth: boolean;
  authConfig?: Record<string, unknown>;
  verificationLevel: KnowledgeVerificationLevel;
  sourcePriority: KnowledgeSourcePriority;
  trustScore: number;
  jurisdictions: string[];
  domains: string[];
  syncEnabled: boolean;
  syncFrequencyHours: number;
  lastSyncedAt?: string;
  nextSyncAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deep Search request
 */
export interface DeepSearchRequest {
  query: string;
  jurisdictions?: string[];
  domains?: string[];
  sourceTypes?: DeepSearchSourceType[];
  includeSecondary?: boolean;
  maxResults?: number;
}

/**
 * Deep Search result
 */
export interface DeepSearchResult {
  sourceId: string;
  sourceName: string;
  sourceType: DeepSearchSourceType;
  verificationLevel: KnowledgeVerificationLevel;
  content: string;
  url?: string;
  citations: string[];
  relevanceScore: number;
  isFromCache: boolean;
  cachedAt?: string;
}

/**
 * Deep Search response
 */
export interface DeepSearchResponse {
  results: DeepSearchResult[];
  totalResults: number;
  sourcesQueried: string[];
  hasAuthoritativeSources: boolean;
  requiresUpdate: boolean;
  meta: {
    queryTime: number;
    cacheHitRate: number;
    primarySourceCount: number;
    secondarySourceCount: number;
  };
}

// ============================================
// RETRIEVAL GUARDRAILS TYPES
// ============================================

/**
 * Retrieval guardrail rule
 */
export interface RetrievalGuardrail {
  id: string;
  organizationId: string | null;
  name: string;
  description?: string;
  ruleType: GuardrailRuleType;
  config: Record<string, unknown>;
  appliesToDomains: string[];
  appliesToStandards?: KnowledgeStandardType[];
  minConfidenceScore?: number;
  actionOnViolation: GuardrailAction;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Guardrail evaluation result
 */
export interface GuardrailEvaluationResult {
  guardrailId: string;
  guardrailName: string;
  ruleType: GuardrailRuleType;
  passed: boolean;
  action?: GuardrailAction;
  reason?: string;
  details?: Record<string, unknown>;
}

/**
 * Guardrail check request
 */
export interface GuardrailCheckRequest {
  orgId: string;
  domain: string;
  sources: KnowledgeSearchResult[];
  confidenceScore: number;
  hasJurisdictionMatch: boolean;
  maxSourceAgeDays?: number;
}

/**
 * Guardrail check response
 */
export interface GuardrailCheckResponse {
  allPassed: boolean;
  results: GuardrailEvaluationResult[];
  actions: GuardrailAction[];
  shouldTriggerDeepSearch: boolean;
  requiresEscalation: boolean;
  disclaimers: string[];
}

// ============================================
// REASONING TRACE TYPES
// ============================================

/**
 * Reasoning step in agent execution
 */
export interface ReasoningStep {
  step: number;
  action: string;
  result?: string;
  chunks?: string[];
  citations?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Agent reasoning trace (hidden from user, visible for auditing)
 */
export interface AgentReasoningTrace {
  id: string;
  organizationId: string;
  agentId: string;
  executionId?: string;
  sessionId?: string;
  userId?: string;

  // Query Information
  queryText: string;

  // Retrieval Details
  sourcesConsulted: string[];
  deepSearchTriggered: boolean;
  deepSearchSources: string[];

  // Guardrail Evaluation
  guardrailsEvaluated: string[];
  guardrailsTriggered: string[];
  guardrailActions: GuardrailAction[];

  // Reasoning Steps
  reasoningSteps: ReasoningStep[];

  // Final Output
  finalAnswer?: string;
  citations: Array<{
    source: string;
    clause: string;
    text: string;
  }>;
  confidenceScore?: number;

  // Performance
  retrievalLatencyMs?: number;
  reasoningLatencyMs?: number;
  totalLatencyMs?: number;

  // Audit Flags
  hasConflicts: boolean;
  requiresReview: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  createdAt: string;
}

/**
 * Create reasoning trace request
 */
export interface CreateReasoningTraceRequest {
  agentId: string;
  queryText: string;
  reasoningSteps: ReasoningStep[];
  sourcesConsulted: string[];
  finalAnswer?: string;
  citations: Array<{
    source: string;
    clause: string;
    text: string;
  }>;
  confidenceScore?: number;
  deepSearchTriggered?: boolean;
  guardrailsTriggered?: string[];
  guardrailActions?: GuardrailAction[];
}

// ============================================
// AGENT KNOWLEDGE ACCESS TYPES
// ============================================

/**
 * Layer 1: Native LLM memory (not trusted as final reference)
 */
export interface NativeMemoryLayer {
  type: 'native_memory';
  description: 'General accounting logic, universal principles';
  trusted: false;
}

/**
 * Layer 2: Verified Knowledge Base (RAG)
 */
export interface VerifiedKnowledgeLayer {
  type: 'verified_kb';
  description: 'Pull citations from CKB, attach specific clauses';
  trusted: true;
  requiresCitation: true;
}

/**
 * Layer 3: Deep Search
 */
export interface DeepSearchLayer {
  type: 'deep_search';
  description: 'Triggered when standard is updated, jurisdiction is missing, etc.';
  triggers: string[];
  sources: DeepSearchSource[];
}

/**
 * Layer 4: Reasoning Validators
 */
export interface ReasoningValidatorLayer {
  type: 'reasoning_validator';
  description: 'Evaluate sources, detect conflicts, request clarification';
  guardrails: RetrievalGuardrail[];
}

/**
 * Complete agent knowledge access configuration
 */
export interface AgentKnowledgeAccess {
  layers: [NativeMemoryLayer, VerifiedKnowledgeLayer, DeepSearchLayer, ReasoningValidatorLayer];
  sourcePriorityRules: {
    primaryOverridesSecondary: true;
    localLawOverridesGlobalForTax: true;
    ifrsOverridesGaapWhenAdopted: true;
    mustCiteClauses: true;
    deepSearchWhenUnsure: true;
  };
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Citation with full metadata
 */
export interface Citation {
  id: string;
  knowledgeEntryId: string;
  sectionKey: string;
  clauseReference: string;
  quotedText: string;
  sourceUrl?: string;
  verificationLevel: KnowledgeVerificationLevel;
  jurisdiction: string[];
}

/**
 * Knowledge conflict
 */
export interface KnowledgeConflict {
  source1: {
    id: string;
    title: string;
    verificationLevel: KnowledgeVerificationLevel;
    content: string;
  };
  source2: {
    id: string;
    title: string;
    verificationLevel: KnowledgeVerificationLevel;
    content: string;
  };
  conflictType: 'contradictory' | 'ambiguous' | 'jurisdiction_specific';
  resolution?: string;
  requiresEscalation: boolean;
}
