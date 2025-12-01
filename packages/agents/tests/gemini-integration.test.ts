import { describe, it, expect, beforeAll } from "vitest";
import { loadAgentsRegistry } from "../src/registry/loader.js";
import { createGeminiConfigFromRegistry } from "../src/gemini/factory.js";
import { runGeminiAgent } from "../src/gemini/runner.js";

describe("Gemini Integration", () => {
  let agents: ReturnType<typeof loadAgentsRegistry>;

  beforeAll(() => {
    agents = loadAgentsRegistry();
  });

  it("should load registry successfully", () => {
    expect(agents).toBeDefined();
    expect(agents.length).toBeGreaterThan(0);
  });

  it("should create Gemini config from registry entry", () => {
    const auditAgent = agents.find((a) => a.id === "audit-materiality-050");
    expect(auditAgent).toBeDefined();

    if (!auditAgent) return;

    const config = createGeminiConfigFromRegistry(auditAgent);
    expect(config.entry.id).toBe("audit-materiality-050");
    expect(config.entry.name).toBe("Materiality & Sampling Agent");
    expect(config.systemPrompt).toContain("ISA 320");
    expect(config.tools).toBeDefined();
  });

  it("should have proper config structure", () => {
    const accountingAgent = agents.find((a) => a.id === "acct-fininst-001");
    expect(accountingAgent).toBeDefined();

    if (!accountingAgent) return;

    const config = createGeminiConfigFromRegistry(accountingAgent);
    expect(config).toHaveProperty("entry");
    expect(config).toHaveProperty("systemPrompt");
    expect(config).toHaveProperty("tools");
    expect(config).toHaveProperty("model");
  });

  // Skip actual API calls in CI (will run with GEMINI_API_KEY set locally)
  it.skipIf(!process.env.GEMINI_API_KEY)(
    "should execute agent with Gemini API",
    async () => {
      const auditAgent = agents.find((a) => a.id === "audit-materiality-050");
      expect(auditAgent).toBeDefined();

      if (!auditAgent) return;

      const config = createGeminiConfigFromRegistry(auditAgent);
      const result = await runGeminiAgent(config, {
        input: "What is materiality in auditing?",
        metadata: { jurisdictionCode: "GLOBAL" },
      });

      expect(result).toBeDefined();
      expect(result.agentId).toBe("audit-materiality-050");
      expect(result.output).toBeTruthy();
      expect(typeof result.output).toBe("string");
      expect(result.metadata).toBeDefined();
    },
    { timeout: 30000 }
  );

  it.skipIf(!process.env.GEMINI_API_KEY)(
    "should handle jurisdiction context",
    async () => {
      const taxAgent = agents.find((a) => a.id === "tax-compliance-mt-034");
      expect(taxAgent).toBeDefined();

      if (!taxAgent) return;

      const config = createGeminiConfigFromRegistry(taxAgent);
      const result = await runGeminiAgent(config, {
        input: "What are the tax filing requirements?",
        metadata: { jurisdictionCode: "MT" },
      });

      expect(result).toBeDefined();
      expect(result.output).toBeTruthy();
      // Should reference Malta in response
      expect(result.output.toLowerCase()).toContain("malta");
    },
    { timeout: 30000 }
  );
});
