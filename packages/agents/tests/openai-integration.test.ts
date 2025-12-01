import { describe, it, expect, beforeAll } from "vitest";
import { loadAgentsRegistry } from "../src/registry/loader.js";
import { createOpenAIAgentFromRegistry } from "../src/openai/factory.js";
import { runOpenAIAgent } from "../src/openai/runner.js";

describe("OpenAI Integration", () => {
  let agents: ReturnType<typeof loadAgentsRegistry>;

  beforeAll(() => {
    agents = loadAgentsRegistry();
  });

  it("should load registry successfully", () => {
    expect(agents).toBeDefined();
    expect(agents.length).toBeGreaterThan(0);
  });

  it("should create OpenAI agent from registry entry", () => {
    const taxAgent = agents.find((a) => a.id === "tax-compliance-mt-034");
    expect(taxAgent).toBeDefined();

    if (!taxAgent) return;

    const agent = createOpenAIAgentFromRegistry(taxAgent);
    expect(agent.id).toBe("tax-compliance-mt-034");
    expect(agent.name).toBe("Malta Tax Compliance Agent");
    expect(agent.instructions).toContain("Malta");
    expect(agent.tools).toBeDefined();
  });

  it("should have proper agent structure", () => {
    const auditAgent = agents.find((a) => a.id === "audit-materiality-050");
    expect(auditAgent).toBeDefined();

    if (!auditAgent) return;

    const agent = createOpenAIAgentFromRegistry(auditAgent);
    expect(agent).toHaveProperty("id");
    expect(agent).toHaveProperty("name");
    expect(agent).toHaveProperty("instructions");
    expect(agent).toHaveProperty("tools");
    expect(agent).toHaveProperty("model");
    expect(agent).toHaveProperty("entry");
  });

  // Skip actual API calls in CI (will run with OPENAI_API_KEY set locally)
  it.skipIf(!process.env.OPENAI_API_KEY)(
    "should execute agent with OpenAI API",
    async () => {
      const taxAgent = agents.find((a) => a.id === "tax-compliance-mt-034");
      expect(taxAgent).toBeDefined();

      if (!taxAgent) return;

      const agent = createOpenAIAgentFromRegistry(taxAgent);
      const result = await runOpenAIAgent(agent, {
        input: "What is the corporate tax rate in Malta?",
        metadata: { jurisdictionCode: "MT" },
      });

      expect(result).toBeDefined();
      expect(result.agentId).toBe("tax-compliance-mt-034");
      expect(result.output).toBeTruthy();
      expect(typeof result.output).toBe("string");
      expect(result.metadata).toBeDefined();
    },
    { timeout: 30000 }
  );
});
