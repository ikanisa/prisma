/**
 * LLM-based Web Source Classifier
 * Uses OpenAI to refine classification for unknown/ambiguous sources
 */

import OpenAI from "openai";
import type { WebSourceClassification, ClassificationContext } from "./types";

// Initialize OpenAI client (uses OPENAI_API_KEY from environment)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * System prompt that guides the LLM to classify within our controlled vocabulary
 */
const SYSTEM_PROMPT = `You are a classification engine for an accounting/audit/tax AI knowledge base.

You must classify a web URL into structured metadata:

**Category** (choose one):
- IFRS: International Financial Reporting Standards
- IAS: International Accounting Standards
- IFRIC: IFRS Interpretations
- ISA: International Standards on Auditing
- ETHICS: Professional ethics and conduct codes
- TAX: Tax law and regulations
- CORP: Corporate law and company regulations
- REG: Financial regulatory authorities
- AML: Anti-money laundering and KYC
- PRO: Professional accounting bodies (ACCA, CPA, etc.)
- US_GAAP: US Generally Accepted Accounting Principles
- PUBLIC_SECTOR: Public sector accounting standards
- ESG: Environmental, Social, Governance reporting
- VALUATION: Business valuation standards
- LAW: General legal resources
- KNOWLEDGE: Knowledge management and technical libraries
- TECH: Technology and software resources
- BANKING: Banking regulation and supervision
- FIRM: Accounting/audit firm resources (Big Four, etc.)
- GOVERNANCE: Corporate governance
- RESEARCH: Academic research and papers
- GOV: Government publications
- BIG4: Big Four firm insights and guidance
- UNKNOWN: Cannot determine category

**Jurisdiction Code** (ISO-like regional code):
- GLOBAL: International/worldwide scope
- RW: Rwanda
- MT: Malta
- EU: European Union
- US: United States
- UK: United Kingdom
- CA: Canada
- KE: Kenya
- UG: Uganda
- TZ: Tanzania
- ZA: South Africa
- (or any other ISO country code)

**Tags**: 3–10 short, relevant tags (e.g., "ifrs9", "financial-instruments", "rwanda-vat")

**Source Type** (choose one):
- ifrs_foundation
- iaasb
- acca
- cpa
- oecd
- tax_authority
- gaap
- gazette
- regulatory_pdf
- company_policy
- big_four
- academic

**Verification Level**:
- primary: Authoritative primary sources (IFRS, ISA, tax laws)
- secondary: Interpretation materials (Big Four, professional bodies)
- tertiary: Internal policies, templates

**Confidence**: 0-100 score of how confident you are in this classification

Return ONLY valid JSON. If you cannot determine a field, use "UNKNOWN" for category or "GLOBAL" for jurisdiction.`;

interface LLMClassificationParams {
  url: string;
  pageTitle?: string;
  pageSnippet?: string;
  heuristicGuess: WebSourceClassification;
}

interface LLMResponse {
  category: string;
  jurisdiction_code: string;
  tags: string[];
  source_type?: string;
  verification_level?: "primary" | "secondary" | "tertiary";
  confidence: number;
}

/**
 * Classify a web source using OpenAI
 * Combines heuristic guess with LLM intelligence for better accuracy
 */
export async function classifyWithLLM(
  params: LLMClassificationParams
): Promise<WebSourceClassification> {
  const { url, pageTitle, pageSnippet, heuristicGuess } = params;

  const userContent = `
URL: ${url}
Page title: ${pageTitle ?? "unknown"}
Snippet: ${pageSnippet ?? "unknown"}

Heuristic guess (may be incorrect):
- category: ${heuristicGuess.category}
- jurisdiction_code: ${heuristicGuess.jurisdictionCode}
- tags: ${heuristicGuess.tags.join(", ") || "none"}
- confidence: ${heuristicGuess.confidence}

Please provide an improved classification based on the URL and context.
  `.trim();

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cost-effective
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature for consistent classification
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const json = JSON.parse(content) as LLMResponse;

    // Merge LLM classification with heuristic
    const category =
      json.category && json.category !== "UNKNOWN"
        ? json.category
        : heuristicGuess.category;

    const jurisdictionCode =
      json.jurisdiction_code || heuristicGuess.jurisdictionCode;

    // Combine tags from both sources, deduplicate
    const allTags = [...heuristicGuess.tags, ...(json.tags || [])];
    const uniqueTags = Array.from(new Set(allTags));

    // Average the confidence scores
    const combinedConfidence = Math.round(
      (heuristicGuess.confidence + (json.confidence || 50)) / 2
    );

    return {
      category,
      jurisdictionCode,
      tags: uniqueTags,
      confidence: Math.min(combinedConfidence, 100),
      source: "MIXED",
      sourceType: json.source_type || heuristicGuess.sourceType,
      verificationLevel:
        json.verification_level || heuristicGuess.verificationLevel,
      sourcePriority: heuristicGuess.sourcePriority,
    };
  } catch (error) {
    // Fallback to heuristic on error
    console.error("LLM classification failed:", error);
    return {
      ...heuristicGuess,
      source: "HEURISTIC", // Mark as fallback
    };
  }
}

/**
 * Batch classify multiple URLs
 * Uses concurrent requests with rate limiting
 */
export async function classifyBatch(
  contexts: ClassificationContext[],
  heuristicGuesses: WebSourceClassification[],
  options?: {
    concurrency?: number;
  }
): Promise<WebSourceClassification[]> {
  const concurrency = options?.concurrency ?? 5;
  const results: WebSourceClassification[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < contexts.length; i += concurrency) {
    const batch = contexts.slice(i, i + concurrency);
    const guesses = heuristicGuesses.slice(i, i + concurrency);

    const promises = batch.map((ctx, idx) =>
      classifyWithLLM({
        url: ctx.url,
        pageTitle: ctx.pageTitle,
        pageSnippet: ctx.pageSnippet,
        heuristicGuess: guesses[idx],
      })
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}
