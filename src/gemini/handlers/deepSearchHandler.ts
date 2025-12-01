/**
 * Gemini Deep Search Handler
 * Executes deep_search_kb function calls from Gemini agents
 */

import { deepSearch } from '../../lib/deepSearch';
import type { GeminiDeepSearchArgs } from '../tools/deepSearch';

export async function handleGeminiDeepSearch(args: GeminiDeepSearchArgs) {
  const res = await deepSearch({
    query: args.query,
    category: args.category ?? null,
    jurisdictionCode: args.jurisdictionCode ?? null,
    matchCount: args.matchCount ?? 10,
  });

  return {
    total_hits: res.length,
    hits: res.map((r) => ({
      id: r.id,
      content: r.content,
      similarity: r.similarity,
      source_name: r.source_name,
      page_url: r.page_url,
      category: r.category,
      jurisdiction_code: r.jurisdiction_code,
      tags: r.tags,
    })),
  };
}
