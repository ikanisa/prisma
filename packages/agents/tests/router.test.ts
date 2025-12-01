import { describe, it, expect, beforeAll } from "vitest";
import { AgentRouter } from "../src/router.js";

describe("Agent Router", () => {
  let router: AgentRouter;

  beforeAll(() => {
    router = new AgentRouter();
  });

  it("should initialize successfully", () => {
    expect(router).toBeDefined();
  });

  it("should list all agents", () => {
    const agents = router.listAgents();
    expect(agents.length).toBeGreaterThan(0);
  });

  it("should get agent by id", () => {
    const agent = router.getAgent("tax-compliance-mt-034");
    expect(agent).toBeDefined();
    expect(agent?.name).toBe("Malta Tax Compliance Agent");
  });

  it("should search agents by category", () => {
    const taxAgents = router.searchAgents({ category: "tax" });
    expect(taxAgents.length).toBeGreaterThan(0);
    taxAgents.forEach((agent) => {
      expect(agent.category).toBe("tax");
    });
  });

  it("should search agents by jurisdiction", () => {
    const maltaAgents = router.searchAgents({ jurisdiction: "MT" });
    expect(maltaAgents.length).toBeGreaterThan(0);
  });

  it("should search agents by tags", () => {
    const complianceAgents = router.searchAgents({ tags: ["compliance"] });
    expect(complianceAgents.length).toBeGreaterThan(0);
  });

  it("should run agent with openai engine", async () => {
    const result = await router.run({
      agentId: "tax-compliance-mt-034",
      input: "Test query",
      forceEngine: "openai",
    });

    expect(result).toBeDefined();
    expect(result.agentId).toBe("tax-compliance-mt-034");
    expect(result.engine).toBe("openai");
    expect(result.output).toBeDefined();
  });

  it("should run agent with gemini engine", async () => {
    const result = await router.run({
      agentId: "audit-materiality-050",
      input: "Test query",
      forceEngine: "gemini",
    });

    expect(result).toBeDefined();
    expect(result.agentId).toBe("audit-materiality-050");
    expect(result.engine).toBe("gemini");
    expect(result.output).toBeDefined();
  });

  it("should use primary engine by default", async () => {
    const agent = router.getAgent("tax-compliance-mt-034");
    expect(agent?.engine_preferences.primary).toBeDefined();

    const result = await router.run({
      agentId: "tax-compliance-mt-034",
      input: "Test query",
    });

    expect(result.engine).toBe(agent?.engine_preferences.primary);
  });

  it("should throw error for unknown agent", async () => {
    await expect(
      router.run({
        agentId: "non-existent-agent",
        input: "Test query",
      })
    ).rejects.toThrow("Unknown agent");
  });

  it("should pass metadata to agent", async () => {
    const result = await router.run({
      agentId: "tax-compliance-mt-034",
      input: "Test query",
      metadata: {
        jurisdictionCode: "MT",
        userId: "test-user",
        sessionId: "test-session",
      },
    });

    expect(result).toBeDefined();
  });
});
