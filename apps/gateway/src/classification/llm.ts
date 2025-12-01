/**
 * LLM-based Classifier
 * Uses OpenAI to classify unknown/new URLs
 */

import type { WebSourceClassification } from "./types";

interface LLMClassificationParams {
  url: string;
  pageTitle?: string;
  pageSnippet?: string;
  heuristic: WebSourceClassification;
}

interface LLMClassificationResult {
  category: string;
  jurisdiction_code: string;
  tags: string[];
  confidence: number;
  source_type?: string;
  verification_level?: string;
  source_priority?: string;
}

/**
 * Classify using OpenAI
 * Requires OPENAI_API_KEY environment variable
 */
export async function classifyWithLLM(
  params: LLMClassificationParams
): Promise<WebSourceClassification> {
  const { url, pageTitle, pageSnippet, heuristic } = params;

  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not configured, skipping LLM classification");
    return heuristic;
  }

  const systemPrompt = `You are a classification engine for an accounting/audit/tax AI knowledge base.

You must classify a web URL into:
- category: one of ["IFRS","ISA","ETHICS","TAX","CORP","REG","AML","PRO","US_GAAP","PUBLIC_SECTOR","ESG","VALUATION","LAW","KNOWLEDGE","TECH","BANKING","FIRM","GOVERNANCE","RESEARCH","GOV","BIG4"]
- jurisdiction_code: ISO-like regional code, e.g. "GLOBAL","RW","MT","EU","US","UK","CA","KE","UG","TZ","ZA"
- tags: 3-10 short tags
- source_type: one of ["ifrs_foundation","iaasb","acca","cpa","oecd","tax_authority","gaap","gazette","regulatory_pdf","company_policy","big_four","academic"]
- verification_level: one of ["primary","secondary","tertiary"]
- source_priority: one of ["authoritative","regulatory","interpretive","supplementary"]

Return ONLY JSON. If you are not sure, set category to "UNKNOWN".`;

  const userContent = `URL: ${url}
Page title: ${pageTitle ?? "unknown"}
Snippet: ${pageSnippet ?? "unknown"}

Heuristic guess:
- category: ${heuristic.category}
- jurisdiction_code: ${heuristic.jurisdictionCode}
- tags: ${heuristic.tags.join(",")}`;

  try {
    // Dynamic import to avoid bundling OpenAI if not used
    const { default: OpenAI } = await import("openai");
    
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const json = JSON.parse(content) as LLMClassificationResult;

    // Merge with heuristic
    const combinedConfidence = Math.round(
      (heuristic.confidence + json.confidence) / 2
    );

    return {
      category: json.category !== "UNKNOWN" ? json.category : heuristic.category,
      jurisdictionCode: json.jurisdiction_code || heuristic.jurisdictionCode,
      tags: [...new Set([...heuristic.tags, ...json.tags])],
      confidence: combinedConfidence,
      source: "MIXED",
      sourceType: (json.source_type as any) || heuristic.sourceType,
      verificationLevel: (json.verification_level as any) || heuristic.verificationLevel,
      sourcePriority: (json.source_priority as any) || heuristic.sourcePriority,
    };
  } catch (error) {
    console.error("LLM classification failed:", error);
    // Fall back to heuristic on error
    return heuristic;
  }
}

/**
 * Check if LLM classification is available
 */
export function isLLMAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
