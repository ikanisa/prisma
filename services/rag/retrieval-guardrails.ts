/**
 * Retrieval Guardrails Service
 * Validates agent responses before delivery
 *
 * Guardrails ensure:
 * - Sources match the question
 * - Source conflicts are handled
 * - Jurisdiction requirements are verified
 * - Outdated info is flagged
 * - Citations are included
 * - Low confidence triggers escalation
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey } from '@prisma-glow/lib/secrets';
import type {
  RetrievalGuardrail,
  GuardrailCheckRequest,
  GuardrailCheckResponse,
  GuardrailEvaluationResult,
  GuardrailAction,
  GuardrailRuleType,
  KnowledgeSearchResult,
  KnowledgeConflict,
  KnowledgeVerificationLevel,
} from './types/curated-knowledge-base.js';

let cachedSupabase: SupabaseClient | null = null;

async function getSupabase(): Promise<SupabaseClient> {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  const url = process.env.SUPABASE_URL ?? '';
  if (!url) {
    throw new Error('SUPABASE_URL must be configured for guardrails.');
  }

  const serviceRoleKey = await getSupabaseServiceRoleKey();
  cachedSupabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedSupabase;
}

/**
 * Load guardrails for an organization
 */
export async function loadGuardrails(orgId: string): Promise<RetrievalGuardrail[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('retrieval_guardrails')
    .select('*')
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    ruleType: row.rule_type,
    config: row.config ?? {},
    appliesToDomains: row.applies_to_domains ?? [],
    appliesToStandards: row.applies_to_standards,
    minConfidenceScore: row.min_confidence_score ? parseFloat(row.min_confidence_score) : undefined,
    actionOnViolation: row.action_on_violation,
    priority: row.priority,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Check all guardrails for a given context
 */
export async function checkGuardrails(request: GuardrailCheckRequest): Promise<GuardrailCheckResponse> {
  const guardrails = await loadGuardrails(request.orgId);
  const results: GuardrailEvaluationResult[] = [];
  const actions: Set<GuardrailAction> = new Set();
  const disclaimers: string[] = [];
  let shouldTriggerDeepSearch = false;
  let requiresEscalation = false;

  for (const guardrail of guardrails) {
    // Check if guardrail applies to this domain
    if (
      guardrail.appliesToDomains.length > 0 &&
      !guardrail.appliesToDomains.includes(request.domain)
    ) {
      continue;
    }

    const result = await evaluateGuardrail(guardrail, request);
    results.push(result);

    if (!result.passed) {
      if (result.action) {
        actions.add(result.action);
      }

      switch (result.action) {
        case 'deep_search':
          shouldTriggerDeepSearch = true;
          break;
        case 'escalate':
          requiresEscalation = true;
          break;
        case 'add_disclaimer':
          if (result.reason) {
            disclaimers.push(result.reason);
          }
          break;
      }
    }
  }

  return {
    allPassed: results.every((r) => r.passed),
    results,
    actions: [...actions],
    shouldTriggerDeepSearch,
    requiresEscalation,
    disclaimers,
  };
}

/**
 * Evaluate a single guardrail
 */
async function evaluateGuardrail(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
): Promise<GuardrailEvaluationResult> {
  const baseResult = {
    guardrailId: guardrail.id,
    guardrailName: guardrail.name,
    ruleType: guardrail.ruleType,
    passed: true,
    action: guardrail.actionOnViolation,
  };

  switch (guardrail.ruleType) {
    case 'source_verification':
      return evaluateSourceVerification(guardrail, request, baseResult);

    case 'conflict_resolution':
      return evaluateConflictResolution(guardrail, request, baseResult);

    case 'jurisdiction_check':
      return evaluateJurisdictionCheck(guardrail, request, baseResult);

    case 'outdated_check':
      return evaluateOutdatedCheck(guardrail, request, baseResult);

    case 'citation_required':
      return evaluateCitationRequired(guardrail, request, baseResult);

    case 'confidence_threshold':
      return evaluateConfidenceThreshold(guardrail, request, baseResult);

    case 'escalation_trigger':
      return evaluateEscalationTrigger(guardrail, request, baseResult);

    case 'deep_search_trigger':
      return evaluateDeepSearchTrigger(guardrail, request, baseResult);

    default:
      return baseResult;
  }
}

/**
 * Verify that sources match the question context
 */
function evaluateSourceVerification(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
  baseResult: GuardrailEvaluationResult,
): GuardrailEvaluationResult {
  const config = guardrail.config as { require_primary_for?: string[] };
  const requirePrimaryFor = config.require_primary_for ?? [];

  // Check if any required topic lacks primary source
  const hasPrimary = request.sources.some((s) => s.verificationLevel === 'primary');

  if (!hasPrimary && requirePrimaryFor.some((topic) => request.domain.includes(topic))) {
    return {
      ...baseResult,
      passed: false,
      reason: `Primary source required for ${request.domain} but none found`,
      details: { requirePrimaryFor, domain: request.domain },
    };
  }

  return { ...baseResult, passed: true };
}

/**
 * Handle conflicts between sources
 */
function evaluateConflictResolution(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
  baseResult: GuardrailEvaluationResult,
): GuardrailEvaluationResult {
  const conflicts = detectConflicts(request.sources);

  if (conflicts.length > 0) {
    const config = guardrail.config as { action?: string; prefer?: string };

    if (config.action === 'escalate_on_conflict') {
      return {
        ...baseResult,
        passed: false,
        action: 'escalate',
        reason: `Source conflict detected: ${conflicts.length} conflicts found`,
        details: { conflicts },
      };
    }

    // Apply preference rules if specified
    if (config.prefer) {
      return {
        ...baseResult,
        passed: true,
        reason: `Conflict resolved by preferring ${config.prefer}`,
        details: { conflicts, resolution: config.prefer },
      };
    }
  }

  return { ...baseResult, passed: true };
}

/**
 * Verify jurisdiction requirements are met
 */
function evaluateJurisdictionCheck(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
  baseResult: GuardrailEvaluationResult,
): GuardrailEvaluationResult {
  const config = guardrail.config as { domains?: string[]; prefer_local?: boolean };

  if (!request.hasJurisdictionMatch) {
    // Check if this domain requires jurisdiction match
    if (config.domains?.includes(request.domain)) {
      return {
        ...baseResult,
        passed: false,
        reason: 'Local jurisdiction source required but not found',
        details: { domain: request.domain },
      };
    }
  }

  // Check for local law preference in tax matters
  if (config.prefer_local && request.domain === 'tax') {
    const hasLocalSource = request.sources.some(
      (s) => s.jurisdiction.length > 0 && !s.jurisdiction.includes('INTL'),
    );

    if (!hasLocalSource) {
      return {
        ...baseResult,
        passed: false,
        action: 'add_disclaimer',
        reason: 'Tax advice based on international standards; local laws may differ',
      };
    }
  }

  return { ...baseResult, passed: true };
}

/**
 * Check for outdated sources
 */
function evaluateOutdatedCheck(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
  baseResult: GuardrailEvaluationResult,
): GuardrailEvaluationResult {
  const config = guardrail.config as { max_age_days?: number; domains?: string[] };
  const maxAgeDays = config.max_age_days ?? 30;

  // Check if domain applies
  if (config.domains && !config.domains.includes(request.domain)) {
    return { ...baseResult, passed: true };
  }

  // Check source age
  if (request.maxSourceAgeDays && request.maxSourceAgeDays > maxAgeDays) {
    return {
      ...baseResult,
      passed: false,
      action: 'deep_search',
      reason: `Sources may be outdated (${request.maxSourceAgeDays} days old)`,
      details: { maxSourceAgeDays: request.maxSourceAgeDays, threshold: maxAgeDays },
    };
  }

  // Check for outdated flags
  const outdatedSources = request.sources.filter((s) => s.isOutdated);
  if (outdatedSources.length > 0) {
    return {
      ...baseResult,
      passed: false,
      action: 'deep_search',
      reason: `${outdatedSources.length} source(s) flagged as potentially outdated`,
      details: { outdatedSources: outdatedSources.map((s) => s.title) },
    };
  }

  return { ...baseResult, passed: true };
}

/**
 * Ensure citations are included for certain topics
 */
function evaluateCitationRequired(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
  baseResult: GuardrailEvaluationResult,
): GuardrailEvaluationResult {
  const config = guardrail.config as { require_clause_reference?: boolean; domains?: string[] };

  // Check if domain applies
  if (config.domains && !config.domains.includes(request.domain)) {
    return { ...baseResult, passed: true };
  }

  // Check if sources have section keys (clause references)
  if (config.require_clause_reference) {
    const sourcesWithClauses = request.sources.filter((s) => s.sectionKey);
    if (sourcesWithClauses.length === 0 && request.sources.length > 0) {
      return {
        ...baseResult,
        passed: false,
        action: 'warn',
        reason: 'Citation clause references required but not found in sources',
      };
    }
  }

  return { ...baseResult, passed: true };
}

/**
 * Check confidence threshold
 */
function evaluateConfidenceThreshold(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
  baseResult: GuardrailEvaluationResult,
): GuardrailEvaluationResult {
  const config = guardrail.config as { min_confidence?: number };
  const minConfidence = config.min_confidence ?? guardrail.minConfidenceScore ?? 0.7;

  if (request.confidenceScore < minConfidence) {
    return {
      ...baseResult,
      passed: false,
      action: 'escalate',
      reason: `Confidence score ${request.confidenceScore.toFixed(2)} below threshold ${minConfidence}`,
      details: { confidenceScore: request.confidenceScore, threshold: minConfidence },
    };
  }

  return { ...baseResult, passed: true };
}

/**
 * Check for escalation triggers
 */
function evaluateEscalationTrigger(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
  baseResult: GuardrailEvaluationResult,
): GuardrailEvaluationResult {
  const config = guardrail.config as { triggers?: string[] };
  const triggers = config.triggers ?? [];

  for (const trigger of triggers) {
    switch (trigger) {
      case 'no_sources':
        if (request.sources.length === 0) {
          return {
            ...baseResult,
            passed: false,
            action: 'escalate',
            reason: 'No sources found for query',
          };
        }
        break;

      case 'low_similarity':
        if (request.sources.every((s) => s.similarityScore < 0.5)) {
          return {
            ...baseResult,
            passed: false,
            action: 'escalate',
            reason: 'All sources have low similarity scores',
          };
        }
        break;

      case 'secondary_only':
        if (request.sources.every((s) => s.verificationLevel !== 'primary')) {
          return {
            ...baseResult,
            passed: false,
            action: 'escalate',
            reason: 'No primary sources available',
          };
        }
        break;
    }
  }

  return { ...baseResult, passed: true };
}

/**
 * Check for Deep Search triggers
 */
function evaluateDeepSearchTrigger(
  guardrail: RetrievalGuardrail,
  request: GuardrailCheckRequest,
  baseResult: GuardrailEvaluationResult,
): GuardrailEvaluationResult {
  const config = guardrail.config as { trigger_on?: string[] };
  const triggerOn = config.trigger_on ?? [];

  for (const trigger of triggerOn) {
    switch (trigger) {
      case 'missing_jurisdiction':
        if (!request.hasJurisdictionMatch) {
          return {
            ...baseResult,
            passed: false,
            action: 'deep_search',
            reason: 'Missing jurisdiction-specific information',
          };
        }
        break;

      case 'ambiguous_law':
        if (request.domain === 'tax' && request.sources.length === 0) {
          return {
            ...baseResult,
            passed: false,
            action: 'deep_search',
            reason: 'No tax law sources found, triggering Deep Search',
          };
        }
        break;

      case 'no_sources':
        if (request.sources.length === 0) {
          return {
            ...baseResult,
            passed: false,
            action: 'deep_search',
            reason: 'No sources in knowledge base, triggering Deep Search',
          };
        }
        break;
    }
  }

  return { ...baseResult, passed: true };
}

/**
 * Detect conflicts between sources
 */
function detectConflicts(sources: KnowledgeSearchResult[]): KnowledgeConflict[] {
  const conflicts: KnowledgeConflict[] = [];

  // Group sources by topic (using first tag as proxy)
  const sourcesByTopic: Map<string, KnowledgeSearchResult[]> = new Map();
  for (const source of sources) {
    const topic = source.tags[0] ?? 'unknown';
    const existing = sourcesByTopic.get(topic) ?? [];
    existing.push(source);
    sourcesByTopic.set(topic, existing);
  }

  // Check for conflicts within each topic
  for (const [, topicSources] of sourcesByTopic) {
    if (topicSources.length < 2) continue;

    // Check for different verification levels giving different info
    const primary = topicSources.filter((s) => s.verificationLevel === 'primary');
    const secondary = topicSources.filter((s) => s.verificationLevel !== 'primary');

    if (primary.length > 0 && secondary.length > 0) {
      // This is a potential conflict - primary should override
      for (const sec of secondary) {
        conflicts.push({
          source1: {
            id: primary[0].knowledgeId,
            title: primary[0].title,
            verificationLevel: primary[0].verificationLevel,
            content: primary[0].fullText.substring(0, 200),
          },
          source2: {
            id: sec.knowledgeId,
            title: sec.title,
            verificationLevel: sec.verificationLevel,
            content: sec.fullText.substring(0, 200),
          },
          conflictType: 'ambiguous',
          resolution: 'Primary source takes precedence',
          requiresEscalation: false,
        });
      }
    }

    // Check for jurisdiction-specific conflicts
    const jurisdictions = [...new Set(topicSources.flatMap((s) => s.jurisdiction))];
    if (jurisdictions.length > 1 && !jurisdictions.includes('INTL')) {
      conflicts.push({
        source1: {
          id: topicSources[0].knowledgeId,
          title: topicSources[0].title,
          verificationLevel: topicSources[0].verificationLevel,
          content: topicSources[0].fullText.substring(0, 200),
        },
        source2: {
          id: topicSources[1].knowledgeId,
          title: topicSources[1].title,
          verificationLevel: topicSources[1].verificationLevel,
          content: topicSources[1].fullText.substring(0, 200),
        },
        conflictType: 'jurisdiction_specific',
        requiresEscalation: true,
      });
    }
  }

  return conflicts;
}

/**
 * Get applicable disclaimers based on guardrail evaluations
 */
export function getDisclaimers(results: GuardrailEvaluationResult[]): string[] {
  const disclaimers: string[] = [];

  for (const result of results) {
    if (!result.passed && result.action === 'add_disclaimer' && result.reason) {
      disclaimers.push(result.reason);
    }
  }

  // Add standard disclaimers
  const hasSecondaryOnly = results.some(
    (r) => r.ruleType === 'source_verification' && !r.passed,
  );

  if (hasSecondaryOnly) {
    disclaimers.push(
      'This response is based on secondary interpretation sources. For authoritative guidance, please consult the original standards.',
    );
  }

  return disclaimers;
}

/**
 * Format guardrail results for audit logging
 */
export function formatGuardrailAuditLog(response: GuardrailCheckResponse): Record<string, unknown> {
  return {
    allPassed: response.allPassed,
    totalGuardrails: response.results.length,
    passedGuardrails: response.results.filter((r) => r.passed).length,
    failedGuardrails: response.results.filter((r) => !r.passed).length,
    actionsTriggered: response.actions,
    deepSearchTriggered: response.shouldTriggerDeepSearch,
    escalationRequired: response.requiresEscalation,
    disclaimersCount: response.disclaimers.length,
    failedDetails: response.results
      .filter((r) => !r.passed)
      .map((r) => ({
        guardrail: r.guardrailName,
        ruleType: r.ruleType,
        reason: r.reason,
        action: r.action,
      })),
  };
}
