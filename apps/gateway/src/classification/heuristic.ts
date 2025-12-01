/**
 * Heuristic URL Classifier
 * Fast, rule-based classification for known domains
 */

import type { DomainRule, WebSourceClassification } from "./types";

/**
 * Domain classification rules
 * Maintains a mapping of known domains to their classification metadata
 */
const DOMAIN_RULES: DomainRule[] = [
  // === IFRS / IAASB / IFAC (Global Standards) ===
  {
    domain: "ifrs.org",
    category: "IFRS",
    jurisdictionCode: "GLOBAL",
    tags: ["ifrs", "ias", "standards", "accounting"],
    sourceType: "ifrs_foundation",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "iaasb.org",
    category: "ISA",
    jurisdictionCode: "GLOBAL",
    tags: ["isa", "audit", "standards", "assurance"],
    sourceType: "iaasb",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "ifac.org",
    category: "IFRS",
    jurisdictionCode: "GLOBAL",
    tags: ["ifac", "profession", "standards"],
    sourceType: "ifrs_foundation",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "ethicsboard.org",
    category: "ETHICS",
    jurisdictionCode: "GLOBAL",
    tags: ["iesba", "ethics", "independence"],
    sourceType: "ifrs_foundation",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },

  // === Big 4 Firms ===
  {
    domain: "kpmg.com",
    category: "BIG4",
    jurisdictionCode: "GLOBAL",
    tags: ["kpmg", "ifrs", "audit", "tax", "insights"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive",
  },
  {
    domain: "viewpoint.pwc.com",
    category: "BIG4",
    jurisdictionCode: "GLOBAL",
    tags: ["pwc", "ifrs", "us-gaap", "technical"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive",
  },
  {
    domain: "pwc.com",
    category: "BIG4",
    jurisdictionCode: "GLOBAL",
    tags: ["pwc", "audit", "tax", "advisory"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive",
  },
  {
    domain: "iasplus.com",
    category: "IFRS",
    jurisdictionCode: "GLOBAL",
    tags: ["deloitte", "ifrs", "ias", "updates"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive",
  },
  {
    domain: "deloitte.com",
    category: "BIG4",
    jurisdictionCode: "GLOBAL",
    tags: ["deloitte", "audit", "tax", "consulting"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive",
  },
  {
    domain: "ey.com",
    category: "BIG4",
    jurisdictionCode: "GLOBAL",
    tags: ["ey", "ifrs", "audit", "tax"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive",
  },

  // === Rwanda ===
  {
    domain: "rra.gov.rw",
    category: "TAX",
    jurisdictionCode: "RW",
    tags: ["rwanda", "tax", "rra", "vat", "income-tax"],
    sourceType: "tax_authority",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "rdb.rw",
    category: "CORP",
    jurisdictionCode: "RW",
    tags: ["rwanda", "company", "investment", "registration"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "regulatory",
  },
  {
    domain: "bnr.rw",
    category: "REG",
    jurisdictionCode: "RW",
    tags: ["rwanda", "banking", "regulation", "central-bank"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "regulatory",
  },

  // === Malta ===
  {
    domain: "cfr.gov.mt",
    category: "TAX",
    jurisdictionCode: "MT",
    tags: ["malta", "tax", "cfr", "vat", "income-tax"],
    sourceType: "tax_authority",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "mbr.mt",
    category: "CORP",
    jurisdictionCode: "MT",
    tags: ["malta", "company-registry", "incorporation"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "regulatory",
  },
  {
    domain: "mfsa.mt",
    category: "REG",
    jurisdictionCode: "MT",
    tags: ["malta", "mfsa", "financial", "regulation"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "regulatory",
  },
  {
    domain: "fiaumalta.org",
    category: "AML",
    jurisdictionCode: "MT",
    tags: ["aml", "kyc", "fiau", "malta"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "regulatory",
  },

  // === OECD ===
  {
    domain: "oecd.org",
    category: "TAX",
    jurisdictionCode: "GLOBAL",
    tags: ["oecd", "tax", "beps", "transfer-pricing"],
    sourceType: "oecd",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },

  // === Professional Bodies ===
  {
    domain: "accaglobal.com",
    category: "PRO",
    jurisdictionCode: "GLOBAL",
    tags: ["acca", "exams", "technical", "cpd"],
    sourceType: "acca",
    verificationLevel: "secondary",
    sourcePriority: "interpretive",
  },
  {
    domain: "aicpa.org",
    category: "PRO",
    jurisdictionCode: "US",
    tags: ["aicpa", "cpa", "us-gaap"],
    sourceType: "cpa",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "cpacanada.ca",
    category: "PRO",
    jurisdictionCode: "CA",
    tags: ["cpa-canada", "ifrs", "aspe"],
    sourceType: "cpa",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "icaew.com",
    category: "PRO",
    jurisdictionCode: "UK",
    tags: ["icaew", "uk-gaap", "frs"],
    sourceType: "acca",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "cimaglobal.com",
    category: "PRO",
    jurisdictionCode: "GLOBAL",
    tags: ["cima", "management-accounting", "strategic"],
    sourceType: "acca",
    verificationLevel: "secondary",
    sourcePriority: "interpretive",
  },

  // === US GAAP / FASB ===
  {
    domain: "fasb.org",
    category: "US_GAAP",
    jurisdictionCode: "US",
    tags: ["us-gaap", "fasb", "asc"],
    sourceType: "gaap",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "sec.gov",
    category: "REG",
    jurisdictionCode: "US",
    tags: ["sec", "edgar", "10-k", "regulatory"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "regulatory",
  },

  // === EU ===
  {
    domain: "europa.eu",
    category: "REG",
    jurisdictionCode: "EU",
    tags: ["eu", "directives", "regulation"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "regulatory",
  },

  // === UK ===
  {
    domain: "frc.org.uk",
    category: "REG",
    jurisdictionCode: "UK",
    tags: ["frc", "uk-gaap", "frs", "standards"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "authoritative",
  },
  {
    domain: "gov.uk",
    category: "GOV",
    jurisdictionCode: "UK",
    tags: ["hmrc", "tax", "vat", "companies-house"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "regulatory",
  },

  // === Academic / Research ===
  {
    domain: "ssrn.com",
    category: "RESEARCH",
    jurisdictionCode: "GLOBAL",
    tags: ["research", "papers", "academic"],
    sourceType: "academic",
    verificationLevel: "tertiary",
    sourcePriority: "supplementary",
  },
];

/**
 * Extract domain from URL
 */
function getDomainFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Classify URL using heuristic rules
 * Fast, deterministic classification for known domains
 */
export function classifyByHeuristic(url: string): WebSourceClassification {
  const domain = getDomainFromUrl(url);
  
  if (!domain) {
    return {
      category: "UNKNOWN",
      jurisdictionCode: "GLOBAL",
      tags: [],
      confidence: 0,
      source: "HEURISTIC",
      sourceType: "company_policy",
      verificationLevel: "tertiary",
      sourcePriority: "supplementary",
    };
  }

  // Exact domain match or subdomain match
  const rule = DOMAIN_RULES.find(
    (r) => domain === r.domain || domain.endsWith(`.${r.domain}`)
  );

  if (rule) {
    return {
      category: rule.category,
      jurisdictionCode: rule.jurisdictionCode,
      tags: rule.tags,
      confidence: 85,
      source: "HEURISTIC",
      sourceType: rule.sourceType,
      verificationLevel: rule.verificationLevel,
      sourcePriority: rule.sourcePriority,
    };
  }

  // Fallback: guess jurisdiction from TLD (low confidence)
  let jurisdictionCode = "GLOBAL";
  if (domain.endsWith(".rw")) jurisdictionCode = "RW";
  else if (domain.endsWith(".mt")) jurisdictionCode = "MT";
  else if (domain.endsWith(".uk")) jurisdictionCode = "UK";
  else if (domain.endsWith(".ca")) jurisdictionCode = "CA";
  else if (domain.endsWith(".us")) jurisdictionCode = "US";
  else if (domain.endsWith(".eu")) jurisdictionCode = "EU";
  else if (domain.endsWith(".ke")) jurisdictionCode = "KE";
  else if (domain.endsWith(".ug")) jurisdictionCode = "UG";
  else if (domain.endsWith(".tz")) jurisdictionCode = "TZ";
  else if (domain.endsWith(".za")) jurisdictionCode = "ZA";

  return {
    category: "UNKNOWN",
    jurisdictionCode,
    tags: [],
    confidence: 20,
    source: "HEURISTIC",
    sourceType: "company_policy",
    verificationLevel: "tertiary",
    sourcePriority: "supplementary",
  };
}

/**
 * Add a new domain rule to the classifier
 * Useful for extending classification without code changes
 */
export function addDomainRule(rule: DomainRule): void {
  DOMAIN_RULES.push(rule);
}

/**
 * Get all configured domain rules
 */
export function getDomainRules(): readonly DomainRule[] {
  return Object.freeze([...DOMAIN_RULES]);
}
