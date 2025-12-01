/**
 * Tests for Heuristic Web Source Classifier
 */

import { describe, it, expect } from "vitest";
import { classifyByHeuristic, addDomainRule } from "./heuristic";

describe("classifyByHeuristic", () => {
  describe("Global Standards", () => {
    it("classifies IFRS Foundation correctly", () => {
      const result = classifyByHeuristic("https://www.ifrs.org/issued-standards/");
      
      expect(result.category).toBe("IFRS");
      expect(result.jurisdictionCode).toBe("GLOBAL");
      expect(result.tags).toContain("ifrs");
      expect(result.confidence).toBe(85);
      expect(result.source).toBe("HEURISTIC");
      expect(result.verificationLevel).toBe("primary");
      expect(result.sourcePriority).toBe("authoritative");
    });

    it("classifies IAASB correctly", () => {
      const result = classifyByHeuristic("https://www.iaasb.org/issued-standards");
      
      expect(result.category).toBe("ISA");
      expect(result.jurisdictionCode).toBe("GLOBAL");
      expect(result.tags).toContain("isa");
      expect(result.tags).toContain("audit");
    });

    it("classifies OECD correctly", () => {
      const result = classifyByHeuristic("https://www.oecd.org/tax/beps/");
      
      expect(result.category).toBe("TAX");
      expect(result.jurisdictionCode).toBe("GLOBAL");
      expect(result.tags).toContain("oecd");
      expect(result.tags).toContain("beps");
    });
  });

  describe("Big Four", () => {
    it("classifies KPMG as Big Four", () => {
      const result = classifyByHeuristic("https://home.kpmg.com");
      
      expect(result.category).toBe("BIG4");
      expect(result.verificationLevel).toBe("secondary");
      expect(result.sourcePriority).toBe("interpretive");
    });

    it("classifies IAS Plus (Deloitte) correctly", () => {
      const result = classifyByHeuristic("https://www.iasplus.com");
      
      expect(result.category).toBe("IFRS");
      expect(result.tags).toContain("deloitte");
    });

    it("classifies PwC Viewpoint correctly", () => {
      const result = classifyByHeuristic("https://viewpoint.pwc.com");
      
      expect(result.category).toBe("BIG4");
      expect(result.tags).toContain("pwc");
      expect(result.tags).toContain("ifrs");
    });
  });

  describe("Rwanda", () => {
    it("classifies Rwanda Revenue Authority", () => {
      const result = classifyByHeuristic("https://www.rra.gov.rw");
      
      expect(result.category).toBe("TAX");
      expect(result.jurisdictionCode).toBe("RW");
      expect(result.tags).toContain("rwanda");
      expect(result.tags).toContain("rra");
      expect(result.sourceType).toBe("tax_authority");
      expect(result.verificationLevel).toBe("primary");
    });

    it("classifies Rwanda Development Board", () => {
      const result = classifyByHeuristic("https://rdb.rw");
      
      expect(result.category).toBe("CORP");
      expect(result.jurisdictionCode).toBe("RW");
      expect(result.tags).toContain("company");
    });

    it("classifies National Bank of Rwanda", () => {
      const result = classifyByHeuristic("https://www.bnr.rw");
      
      expect(result.category).toBe("REG");
      expect(result.jurisdictionCode).toBe("RW");
      expect(result.tags).toContain("banking");
    });
  });

  describe("Malta", () => {
    it("classifies Commissioner for Revenue", () => {
      const result = classifyByHeuristic("https://cfr.gov.mt");
      
      expect(result.category).toBe("TAX");
      expect(result.jurisdictionCode).toBe("MT");
      expect(result.tags).toContain("malta");
      expect(result.tags).toContain("cfr");
      expect(result.sourceType).toBe("tax_authority");
    });

    it("classifies MFSA", () => {
      const result = classifyByHeuristic("https://www.mfsa.mt");
      
      expect(result.category).toBe("REG");
      expect(result.jurisdictionCode).toBe("MT");
      expect(result.tags).toContain("mfsa");
      expect(result.verificationLevel).toBe("primary");
    });

    it("classifies FIAU Malta", () => {
      const result = classifyByHeuristic("https://fiaumalta.org");
      
      expect(result.category).toBe("AML");
      expect(result.jurisdictionCode).toBe("MT");
      expect(result.tags).toContain("aml");
      expect(result.tags).toContain("fiau");
    });

    it("classifies Malta Institute of Accountants", () => {
      const result = classifyByHeuristic("https://www.mia.org.mt");
      
      expect(result.category).toBe("PRO");
      expect(result.jurisdictionCode).toBe("MT");
      expect(result.tags).toContain("mia");
    });
  });

  describe("Professional Bodies", () => {
    it("classifies ACCA correctly", () => {
      const result = classifyByHeuristic("https://www.accaglobal.com");
      
      expect(result.category).toBe("PRO");
      expect(result.jurisdictionCode).toBe("GLOBAL");
      expect(result.tags).toContain("acca");
      expect(result.sourceType).toBe("acca");
    });

    it("classifies AICPA correctly", () => {
      const result = classifyByHeuristic("https://www.aicpa.org");
      
      expect(result.category).toBe("PRO");
      expect(result.jurisdictionCode).toBe("US");
      expect(result.tags).toContain("cpa");
    });
  });

  describe("Unknown Domains", () => {
    it("returns UNKNOWN category for unrecognized domain", () => {
      const result = classifyByHeuristic("https://unknown-source.com");
      
      expect(result.category).toBe("UNKNOWN");
      expect(result.confidence).toBe(20);
    });

    it("guesses jurisdiction from TLD", () => {
      const resultRW = classifyByHeuristic("https://unknown.rw");
      expect(resultRW.jurisdictionCode).toBe("RW");
      
      const resultMT = classifyByHeuristic("https://unknown.mt");
      expect(resultMT.jurisdictionCode).toBe("MT");
      
      const resultUK = classifyByHeuristic("https://unknown.uk");
      expect(resultUK.jurisdictionCode).toBe("UK");
    });

    it("handles invalid URLs gracefully", () => {
      const result = classifyByHeuristic("not-a-valid-url");
      
      expect(result.category).toBe("UNKNOWN");
      expect(result.confidence).toBe(0);
    });
  });

  describe("Subdomain Matching", () => {
    it("matches subdomains of known domains", () => {
      const result = classifyByHeuristic("https://standards.ifrs.org");
      
      expect(result.category).toBe("IFRS");
      expect(result.confidence).toBe(85);
    });

    it("matches www subdomains", () => {
      const result = classifyByHeuristic("https://www.iaasb.org");
      
      expect(result.category).toBe("ISA");
    });
  });

  describe("Dynamic Rule Addition", () => {
    it("allows adding custom domain rules", () => {
      addDomainRule({
        domain: "test-authority.example",
        category: "TEST",
        jurisdictionCode: "TEST",
        tags: ["test", "custom"],
        sourceType: "regulatory_pdf",
        verificationLevel: "secondary",
        sourcePriority: "interpretive",
      });

      const result = classifyByHeuristic("https://test-authority.example");
      
      expect(result.category).toBe("TEST");
      expect(result.jurisdictionCode).toBe("TEST");
      expect(result.tags).toContain("custom");
    });

    it("prevents duplicate rules", () => {
      const initialRules = classifyByHeuristic("https://ifrs.org");
      
      addDomainRule({
        domain: "ifrs.org",
        category: "DUPLICATE",
        jurisdictionCode: "XX",
        tags: [],
      });
      
      const afterRules = classifyByHeuristic("https://ifrs.org");
      
      // Should still use original rule, not duplicate
      expect(afterRules.category).toBe("IFRS");
    });
  });

  describe("East Africa", () => {
    it("classifies Kenya KRA", () => {
      const result = classifyByHeuristic("https://www.kra.go.ke");
      
      expect(result.category).toBe("TAX");
      expect(result.jurisdictionCode).toBe("KE");
      expect(result.tags).toContain("kenya");
    });

    it("classifies Uganda URA", () => {
      const result = classifyByHeuristic("https://www.ura.go.ug");
      
      expect(result.category).toBe("TAX");
      expect(result.jurisdictionCode).toBe("UG");
    });

    it("classifies Tanzania TRA", () => {
      const result = classifyByHeuristic("https://www.tra.go.tz");
      
      expect(result.category).toBe("TAX");
      expect(result.jurisdictionCode).toBe("TZ");
    });
  });

  describe("US Standards", () => {
    it("classifies FASB correctly", () => {
      const result = classifyByHeuristic("https://www.fasb.org");
      
      expect(result.category).toBe("US_GAAP");
      expect(result.jurisdictionCode).toBe("US");
      expect(result.tags).toContain("fasb");
      expect(result.verificationLevel).toBe("primary");
    });

    it("classifies SEC correctly", () => {
      const result = classifyByHeuristic("https://www.sec.gov");
      
      expect(result.category).toBe("REG");
      expect(result.jurisdictionCode).toBe("US");
      expect(result.tags).toContain("sec");
    });
  });
});
