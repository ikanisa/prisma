import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAgentsRegistry,
  getAgentById,
  getAgentsByCategory,
  getAgentsByJurisdiction,
  getAgentsByTag,
  searchAgents,
} from "../src/registry/index.js";

describe("Agent Registry", () => {
  let agents: ReturnType<typeof loadAgentsRegistry>;

  beforeAll(() => {
    agents = loadAgentsRegistry();
  });

  it("should load all agents from registry", () => {
    expect(agents).toBeDefined();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
  });

  it("should have valid agent structure", () => {
    const agent = agents[0];
    expect(agent).toHaveProperty("id");
    expect(agent).toHaveProperty("category");
    expect(agent).toHaveProperty("name");
    expect(agent).toHaveProperty("description");
    expect(agent).toHaveProperty("jurisdictions");
    expect(agent).toHaveProperty("standards");
    expect(agent).toHaveProperty("kb_scopes");
    expect(agent).toHaveProperty("tools");
    expect(agent).toHaveProperty("engine_preferences");
    expect(agent).toHaveProperty("routing_tags");
  });

  it("should find agent by id", () => {
    const agent = getAgentById("tax-compliance-mt-034");
    expect(agent).toBeDefined();
    expect(agent?.name).toBe("Malta Tax Compliance Agent");
    expect(agent?.category).toBe("tax");
  });

  it("should return undefined for unknown agent id", () => {
    const agent = getAgentById("non-existent-agent");
    expect(agent).toBeUndefined();
  });

  it("should filter agents by category", () => {
    const taxAgents = getAgentsByCategory("tax");
    expect(taxAgents.length).toBeGreaterThan(0);
    taxAgents.forEach((agent) => {
      expect(agent.category).toBe("tax");
    });
  });

  it("should filter agents by jurisdiction", () => {
    const maltaAgents = getAgentsByJurisdiction("MT");
    expect(maltaAgents.length).toBeGreaterThan(0);
    maltaAgents.forEach((agent) => {
      expect(
        agent.jurisdictions.includes("MT") ||
          agent.jurisdictions.includes("GLOBAL")
      ).toBe(true);
    });
  });

  it("should include GLOBAL agents when filtering by jurisdiction", () => {
    const globalAgents = getAgentsByJurisdiction("GLOBAL");
    expect(globalAgents.length).toBeGreaterThan(0);

    const mtAgents = getAgentsByJurisdiction("MT");
    const mtOnlyAgents = mtAgents.filter((a) => !a.jurisdictions.includes("GLOBAL"));
    const mtGlobalAgents = mtAgents.filter((a) => a.jurisdictions.includes("GLOBAL"));
    
    expect(mtGlobalAgents.length).toBeGreaterThan(0);
  });

  it("should filter agents by tag", () => {
    const complianceAgents = getAgentsByTag("compliance");
    expect(complianceAgents.length).toBeGreaterThan(0);
    complianceAgents.forEach((agent) => {
      expect(agent.routing_tags.includes("compliance")).toBe(true);
    });
  });

  it("should search agents with multiple criteria", () => {
    const results = searchAgents({
      category: "tax",
      jurisdiction: "MT",
      tags: ["compliance"],
    });

    expect(results.length).toBeGreaterThan(0);
    results.forEach((agent) => {
      expect(agent.category).toBe("tax");
      expect(
        agent.jurisdictions.includes("MT") ||
          agent.jurisdictions.includes("GLOBAL")
      ).toBe(true);
      expect(agent.routing_tags.includes("compliance")).toBe(true);
    });
  });

  it("should have unique agent ids", () => {
    const ids = agents.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have valid engine preferences", () => {
    agents.forEach((agent) => {
      expect(["openai", "gemini"]).toContain(agent.engine_preferences.primary);
      if (agent.engine_preferences.fallback) {
        expect(["openai", "gemini"]).toContain(agent.engine_preferences.fallback);
      }
    });
  });

  it("should have at least one kb_scope per agent", () => {
    agents.forEach((agent) => {
      expect(agent.kb_scopes.length).toBeGreaterThan(0);
    });
  });

  it("should have at least one tool per agent", () => {
    agents.forEach((agent) => {
      expect(agent.tools.length).toBeGreaterThan(0);
    });
  });

  it("should have standard categories", () => {
    const validCategories = ["tax", "audit", "accounting", "corporate"];
    agents.forEach((agent) => {
      expect(validCategories).toContain(agent.category);
    });
  });

  it("should have all expected agent categories", () => {
    const categories = new Set(agents.map((a) => a.category));
    expect(categories.has("tax")).toBe(true);
    expect(categories.has("audit")).toBe(true);
    expect(categories.has("accounting")).toBe(true);
    expect(categories.has("corporate")).toBe(true);
  });

  it("should have tax agents", () => {
    const taxAgents = getAgentsByCategory("tax");
    expect(taxAgents.length).toBeGreaterThanOrEqual(8);
  });

  it("should have audit agents", () => {
    const auditAgents = getAgentsByCategory("audit");
    expect(auditAgents.length).toBeGreaterThanOrEqual(8);
  });

  it("should have accounting agents", () => {
    const acctAgents = getAgentsByCategory("accounting");
    expect(acctAgents.length).toBeGreaterThanOrEqual(8);
  });

  it("should have corporate services agents", () => {
    const corpAgents = getAgentsByCategory("corporate");
    expect(corpAgents.length).toBeGreaterThanOrEqual(6);
  });
});
