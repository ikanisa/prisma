/**
 * Classification Types
 * Type definitions for web source auto-classification
 */

export type ClassificationSource = "HEURISTIC" | "LLM" | "MIXED" | "MANUAL";

export type SourceType =
  | "ifrs_foundation"
  | "iaasb"
  | "acca"
  | "cpa"
  | "oecd"
  | "tax_authority"
  | "gaap"
  | "gazette"
  | "regulatory_pdf"
  | "company_policy"
  | "big_four"
  | "academic";

export type VerificationLevel = "primary" | "secondary" | "tertiary";

export type SourcePriority = "authoritative" | "regulatory" | "interpretive" | "supplementary";

export interface WebSourceClassification {
  category: string;
  jurisdictionCode: string;
  tags: string[];
  confidence: number;
  source: ClassificationSource;
  
  // Deep search specific fields
  sourceType?: SourceType;
  verificationLevel?: VerificationLevel;
  sourcePriority?: SourcePriority;
}

export interface DomainRule {
  domain: string;
  category: string;
  jurisdictionCode: string;
  tags: string[];
  sourceType: SourceType;
  verificationLevel: VerificationLevel;
  sourcePriority: SourcePriority;
}
