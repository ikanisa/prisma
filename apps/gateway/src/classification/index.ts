/**
 * Auto-Classification Orchestrator
 * Combines heuristic and LLM classification for web sources
 */

import { classifyByHeuristic } from "./heuristic";
import { classifyWithLLM, isLLMAvailable } from "./llm";
import type { WebSourceClassification } from "./types";

export interface ClassifyOptions {
  url: string;
  pageTitle?: string;
  pageSnippet?: string;
  
  /**
   * Confidence threshold for heuristic classification
   * If heuristic confidence is >= this value, skip LLM
   * @default 80
   */
  heuristicThreshold?: number;
  
  /**
   * Force LLM classification even if heuristic is confident
   * @default false
   */
  forceLLM?: boolean;
}

/**
 * Main classification function
 * Orchestrates heuristic and LLM classification
 */
export async function classifyWebSource(
  options: ClassifyOptions
): Promise<WebSourceClassification> {
  const { url, pageTitle, pageSnippet, heuristicThreshold = 80, forceLLM = false } = options;

  // Always try heuristic first (fast and free)
  const heuristic = classifyByHeuristic(url);

  // If heuristic is confident and we're not forcing LLM, use it
  if (
    !forceLLM &&
    heuristic.confidence >= heuristicThreshold &&
    heuristic.category !== "UNKNOWN"
  ) {
    return heuristic;
  }

  // Try LLM for refinement if available
  if (isLLMAvailable()) {
    const llm = await classifyWithLLM({
      url,
      pageTitle,
      pageSnippet,
      heuristic,
    });
    return llm;
  }

  // Fall back to heuristic if LLM unavailable
  return heuristic;
}

// Re-export types and utilities
export * from "./types";
export { classifyByHeuristic, addDomainRule, getDomainRules } from "./heuristic";
export { classifyWithLLM, isLLMAvailable } from "./llm";
