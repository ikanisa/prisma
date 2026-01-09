/**
 * URL-based Heuristic Classifier
 * Fast, deterministic classification based on domain and URL patterns
 */

import type { WebSourceClassification } from "./types";

interface DomainRule {
  domain: string;
  category: string;
  jurisdictionCode: string;
  tags: string[];
  sourceType?: string;
  verificationLevel?: "primary" | "secondary" | "tertiary";
  sourcePriority?: "authoritative" | "regulatory" | "interpretive" | "supplementary";
}

/**
 * Comprehensive domain classification rules
 * Organized by authority type and jurisdiction
 */
const DOMAIN_RULES: DomainRule[] = [
  // ============================================
  // GLOBAL STANDARDS (Primary/Authoritative)
  // ============================================
  
  // IFRS Foundation
  { 
    domain: "ifrs.org", 
    category: "IFRS", 
    jurisdictionCode: "GLOBAL", 
    tags: ["ifrs", "ias", "standards", "financial-reporting"],
    sourceType: "ifrs_foundation",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // IAASB (International Auditing Standards)
  { 
    domain: "iaasb.org", 
    category: "ISA", 
    jurisdictionCode: "GLOBAL", 
    tags: ["isa", "audit", "standards", "assurance"],
    sourceType: "iaasb",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // IFAC
  { 
    domain: "ifac.org", 
    category: "IFRS", 
    jurisdictionCode: "GLOBAL", 
    tags: ["ifac", "profession", "standards"],
    sourceType: "ifrs_foundation",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // IESBA (Ethics)
  { 
    domain: "ethicsboard.org", 
    category: "ETHICS", 
    jurisdictionCode: "GLOBAL", 
    tags: ["iesba", "ethics", "code-of-conduct"],
    sourceType: "iaasb",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // OECD
  { 
    domain: "oecd.org", 
    category: "TAX", 
    jurisdictionCode: "GLOBAL", 
    tags: ["oecd", "tax", "beps", "transfer-pricing"],
    sourceType: "oecd",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // ============================================
  // BIG FOUR (Secondary/Interpretive)
  // ============================================
  
  // KPMG
  { 
    domain: "kpmg.com", 
    category: "BIG4", 
    jurisdictionCode: "GLOBAL", 
    tags: ["kpmg", "ifrs", "audit", "tax", "insights"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  
  // PwC
  { 
    domain: "pwc.com", 
    category: "BIG4", 
    jurisdictionCode: "GLOBAL", 
    tags: ["pwc", "audit", "tax", "consulting"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  { 
    domain: "viewpoint.pwc.com", 
    category: "BIG4", 
    jurisdictionCode: "GLOBAL", 
    tags: ["pwc", "ifrs", "us-gaap", "accounting"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  
  // Deloitte
  { 
    domain: "iasplus.com", 
    category: "IFRS", 
    jurisdictionCode: "GLOBAL", 
    tags: ["deloitte", "ifrs", "ias", "updates"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  { 
    domain: "deloitte.com", 
    category: "BIG4", 
    jurisdictionCode: "GLOBAL", 
    tags: ["deloitte", "audit", "consulting"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  
  // EY
  { 
    domain: "ey.com", 
    category: "BIG4", 
    jurisdictionCode: "GLOBAL", 
    tags: ["ey", "ifrs", "audit", "tax"],
    sourceType: "big_four",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  
  // ============================================
  // PROFESSIONAL BODIES
  // ============================================
  
  // ACCA
  { 
    domain: "accaglobal.com", 
    category: "PRO", 
    jurisdictionCode: "GLOBAL", 
    tags: ["acca", "exams", "technical", "cpd"],
    sourceType: "acca",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  
  // AICPA (US)
  { 
    domain: "aicpa.org", 
    category: "PRO", 
    jurisdictionCode: "US", 
    tags: ["aicpa", "cpa", "us-gaap"],
    sourceType: "cpa",
    verificationLevel: "primary",
    sourcePriority: "regulatory"
  },
  { 
    domain: "aicpa-cima.com", 
    category: "PRO", 
    jurisdictionCode: "GLOBAL", 
    tags: ["aicpa", "cima", "management-accounting"],
    sourceType: "cpa",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  
  // CPA Canada
  { 
    domain: "cpacanada.ca", 
    category: "PRO", 
    jurisdictionCode: "CA", 
    tags: ["cpa-canada", "canadian-gaap"],
    sourceType: "cpa",
    verificationLevel: "primary",
    sourcePriority: "regulatory"
  },
  
  // ICAEW (UK)
  { 
    domain: "icaew.com", 
    category: "PRO", 
    jurisdictionCode: "UK", 
    tags: ["icaew", "uk-gaap", "audit"],
    sourceType: "acca",
    verificationLevel: "primary",
    sourcePriority: "regulatory"
  },
  
  // CIMA
  { 
    domain: "cimaglobal.com", 
    category: "PRO", 
    jurisdictionCode: "GLOBAL", 
    tags: ["cima", "management-accounting"],
    sourceType: "acca",
    verificationLevel: "secondary",
    sourcePriority: "interpretive"
  },
  
  // ============================================
  // US STANDARDS
  // ============================================
  
  // FASB
  { 
    domain: "fasb.org", 
    category: "US_GAAP", 
    jurisdictionCode: "US", 
    tags: ["us-gaap", "fasb", "accounting-standards"],
    sourceType: "gaap",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // SEC
  { 
    domain: "sec.gov", 
    category: "REG", 
    jurisdictionCode: "US", 
    tags: ["sec", "securities", "edgar", "regulation"],
    sourceType: "regulatory_pdf",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // ============================================
  // RWANDA
  // ============================================
  
  // Rwanda Revenue Authority
  { 
    domain: "rra.gov.rw", 
    category: "TAX", 
    jurisdictionCode: "RW", 
    tags: ["rwanda", "tax", "rra", "vat", "income-tax"],
    sourceType: "tax_authority",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // Rwanda Development Board
  { 
    domain: "rdb.rw", 
    category: "CORP", 
    jurisdictionCode: "RW", 
    tags: ["rwanda", "company", "investment", "registration"],
    sourceType: "regulatory_pdf",
    verificationLevel: "primary",
    sourcePriority: "regulatory"
  },
  
  // National Bank of Rwanda
  { 
    domain: "bnr.rw", 
    category: "REG", 
    jurisdictionCode: "RW", 
    tags: ["rwanda", "banking", "regulation", "monetary-policy"],
    sourceType: "regulatory_pdf",
    verificationLevel: "primary",
    sourcePriority: "regulatory"
  },
  
  // ============================================
  // MALTA
  // ============================================
  
  // Commissioner for Revenue (CFR)
  { 
    domain: "cfr.gov.mt", 
    category: "TAX", 
    jurisdictionCode: "MT", 
    tags: ["malta", "tax", "cfr", "vat", "income-tax"],
    sourceType: "tax_authority",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // Malta Business Registry
  { 
    domain: "mbr.mt", 
    category: "CORP", 
    jurisdictionCode: "MT", 
    tags: ["malta", "company-registry", "mbr"],
    sourceType: "regulatory_pdf",
    verificationLevel: "primary",
    sourcePriority: "regulatory"
  },
  
  // MFSA (Malta Financial Services Authority)
  { 
    domain: "mfsa.mt", 
    category: "REG", 
    jurisdictionCode: "MT", 
    tags: ["malta", "mfsa", "financial", "regulation"],
    sourceType: "regulatory_pdf",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  { 
    domain: "mfsa.com.mt", 
    category: "REG", 
    jurisdictionCode: "MT", 
    tags: ["malta", "mfsa", "financial", "regulation"],
    sourceType: "regulatory_pdf",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // FIAU Malta (AML)
  { 
    domain: "fiaumalta.org", 
    category: "AML", 
    jurisdictionCode: "MT", 
    tags: ["aml", "kyc", "fiau", "malta"],
    sourceType: "regulatory_pdf",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // Malta Institute of Accountants
  { 
    domain: "mia.org.mt", 
    category: "PRO", 
    jurisdictionCode: "MT", 
    tags: ["malta", "mia", "accountants", "cpd"],
    sourceType: "acca",
    verificationLevel: "primary",
    sourcePriority: "regulatory"
  },
  
  // ============================================
  // OTHER JURISDICTIONS
  // ============================================
  
  // Kenya (KRA)
  { 
    domain: "kra.go.ke", 
    category: "TAX", 
    jurisdictionCode: "KE", 
    tags: ["kenya", "tax", "kra"],
    sourceType: "tax_authority",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // Uganda (URA)
  { 
    domain: "ura.go.ug", 
    category: "TAX", 
    jurisdictionCode: "UG", 
    tags: ["uganda", "tax", "ura"],
    sourceType: "tax_authority",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // Tanzania (TRA)
  { 
    domain: "tra.go.tz", 
    category: "TAX", 
    jurisdictionCode: "TZ", 
    tags: ["tanzania", "tax", "tra"],
    sourceType: "tax_authority",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // South Africa (SARS)
  { 
    domain: "sars.gov.za", 
    category: "TAX", 
    jurisdictionCode: "ZA", 
    tags: ["south-africa", "tax", "sars"],
    sourceType: "tax_authority",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // ============================================
  // EU & INTERNATIONAL
  // ============================================
  
  // European Commission
  { 
    domain: "ec.europa.eu", 
    category: "REG", 
    jurisdictionCode: "EU", 
    tags: ["eu", "regulation", "directive"],
    sourceType: "regulatory_pdf",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
  
  // EUR-Lex (EU Law)
  { 
    domain: "eur-lex.europa.eu", 
    category: "LAW", 
    jurisdictionCode: "EU", 
    tags: ["eu", "law", "legislation"],
    sourceType: "gazette",
    verificationLevel: "primary",
    sourcePriority: "authoritative"
  },
];

/**
 * Extract domain from URL
 */
function getDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Classify web source using heuristic rules
 * Fast, deterministic classification based on domain matching
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
    };
  }

  // Try exact domain match first
  let rule = DOMAIN_RULES.find((r) => domain === r.domain);
  
  // If no exact match, try subdomain match (e.g., "www.ifrs.org" matches "ifrs.org")
  if (!rule) {
    rule = DOMAIN_RULES.find((r) => domain.endsWith(`.${r.domain}`));
  }

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

  // Fallback: guess jurisdiction from TLD (very rough heuristic)
  let jurisdictionCode = "GLOBAL";
  
  const tldMap: Record<string, string> = {
    ".rw": "RW",
    ".mt": "MT",
    ".uk": "UK",
    ".ca": "CA",
    ".us": "US",
    ".eu": "EU",
    ".ke": "KE",
    ".ug": "UG",
    ".tz": "TZ",
    ".za": "ZA",
  };

  for (const [tld, code] of Object.entries(tldMap)) {
    if (domain.endsWith(tld)) {
      jurisdictionCode = code;
      break;
    }
  }

  return {
    category: "UNKNOWN",
    jurisdictionCode,
    tags: [],
    confidence: 20,
    source: "HEURISTIC",
  };
}

/**
 * Add a new domain rule dynamically
 * Useful for extending classification without code changes
 */
export function addDomainRule(rule: DomainRule): void {
  // Prevent duplicates
  const exists = DOMAIN_RULES.some((r) => r.domain === rule.domain);
  if (!exists) {
    DOMAIN_RULES.push(rule);
  }
}

/**
 * Get all registered domain rules
 */
export function getDomainRules(): readonly DomainRule[] {
  return DOMAIN_RULES;
}
