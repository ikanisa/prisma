/**
 * Web Source Classification Orchestrator
 * Main entry point for classifying web sources
 */

import { classifyByHeuristic } from "./heuristic";
import { classifyWithLLM } from "./llm";
import type { WebSourceClassification, ClassificationContext } from "./types";

export interface ClassifyOptions {
  /**
   * Minimum confidence threshold to skip LLM refinement
   * If heuristic confidence >= this value, skip LLM call
   * @default 80
   */
  heuristicThreshold?: number;

  /**
   * Force LLM classification even for high-confidence heuristic matches
   * @default false
   */
  forceLLM?: boolean;

  /**
   * Disable LLM classification entirely (heuristic only)
   * @default false
   */
  heuristicOnly?: boolean;
}

/**
 * Classify a web source using heuristic rules and optional LLM refinement
 * 
 * **Strategy:**
 * 1. First try fast heuristic classification based on domain
 * 2. If confidence is low or category is UNKNOWN, use LLM to refine
 * 3. Return best classification with source tracking
 * 
 * @example
 * ```typescript
 * const result = await classifyWebSource({
 *   url: "https://www.ifrs.org/issued-standards/",
 *   pageTitle: "IFRS Standards",
 * });
 * 
 * console.log(result.category); // "IFRS"
 * console.log(result.confidence); // 85
 * console.log(result.source); // "HEURISTIC"
 * ```
 */
export async function classifyWebSource(
  context: ClassificationContext,
  options?: ClassifyOptions
): Promise<WebSourceClassification> {
  const {
    heuristicThreshold = 80,
    forceLLM = false,
    heuristicOnly = false,
  } = options ?? {};

  // Step 1: Always try heuristic first (fast, free)
  const heuristic = classifyByHeuristic(context.url);

  // Step 2: Decide if we need LLM refinement
  const needsLLM =
    !heuristicOnly &&
    (forceLLM ||
      heuristic.confidence < heuristicThreshold ||
      heuristic.category === "UNKNOWN");

  if (!needsLLM) {
    return heuristic;
  }

  // Step 3: Refine with LLM
  const llmResult = await classifyWithLLM({
    url: context.url,
    pageTitle: context.pageTitle,
    pageSnippet: context.pageSnippet,
    heuristicGuess: heuristic,
  });

  return llmResult;
}

/**
 * Batch classify multiple web sources
 * Efficiently processes many URLs with optional parallel LLM calls
 */
export async function classifyBatch(
  contexts: ClassificationContext[],
  options?: ClassifyOptions & { concurrency?: number }
): Promise<WebSourceClassification[]> {
  const results: WebSourceClassification[] = [];

  for (const context of contexts) {
    const result = await classifyWebSource(context, options);
    results.push(result);
  }

  return results;
}

// Re-export types and utilities
export * from "./types";
export { classifyByHeuristic, addDomainRule, getDomainRules } from "./heuristic";
export { classifyWithLLM } from "./llm";
