/**
 * Web Source Classification Types
 * Supports auto-tagging of knowledge sources with category, jurisdiction, and tags
 */

export type ClassificationSource = "HEURISTIC" | "LLM" | "MIXED" | "MANUAL";

export interface WebSourceClassification {
  category: string;
  jurisdictionCode: string;
  tags: string[];
  confidence: number; // 0-100
  source: ClassificationSource;
  sourceType?: string; // Optional: maps to deep_search_sources.source_type
  verificationLevel?: "primary" | "secondary" | "tertiary";
  sourcePriority?: "authoritative" | "regulatory" | "interpretive" | "supplementary";
}

export interface ClassificationContext {
  url: string;
  pageTitle?: string;
  pageSnippet?: string;
  domain?: string;
}
