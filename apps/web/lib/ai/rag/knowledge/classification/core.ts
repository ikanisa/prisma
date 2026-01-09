/**
 * Core Classification Orchestrator
 * Combines heuristic and LLM classification
 */

import { classifyByHeuristic } from './heuristic';
import { classifyWithLLM } from './llm';
import type { WebSourceClassification, ClassificationInput } from './types';

/**
 * Main classification function
 * - Uses heuristic rules first (fast, deterministic)
 * - Falls back to LLM for unknown/low-confidence sources
 */
export async function classifyWebSource(
  input: ClassificationInput
): Promise<WebSourceClassification> {
  // Step 1: Try heuristic classification
  const heuristic = classifyByHeuristic(input.url);

  // Step 2: If heuristic is confident, use it
  if (heuristic.confidence >= 80 && heuristic.category !== 'UNKNOWN') {
    return heuristic;
  }

  // Step 3: If LLM is disabled or not available, return heuristic result
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not set, using heuristic-only classification');
    return heuristic;
  }

  // Step 4: Use LLM to refine classification
  try {
    const llmResult = await classifyWithLLM({
      url: input.url,
      pageTitle: input.pageTitle,
      pageSnippet: input.pageSnippet,
      heuristic,
    });

    return llmResult;
  } catch (error) {
    console.error('LLM classification failed, falling back to heuristic:', error);
    return heuristic;
  }
}
