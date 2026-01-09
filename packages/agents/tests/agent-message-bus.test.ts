import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentMessageBus, createAgentMessage } from "../src/core/agent-message-bus.js";

describe("AgentMessageBus", () => {
  let bus: AgentMessageBus;

  beforeEach(() => {
    bus = new AgentMessageBus();
  });

  it("should create a message with defaults", () => {
    const message = createAgentMessage({
      agentId: "tax-nexus-agent",
      taskType: "TAX_NEXUS",
      context: {
        clientId: "client-123",
        fiscalYear: "2025",
        jurisdiction: "US-CA",
      },
      data: { exposure: 125000 },
      priority: "HIGH",
      autonomyLevel: "HUMAN_REVIEW",
    });

    expect(message.id).toBeDefined();
    expect(message.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("should deliver messages to matching subscribers", async () => {
    const handler = vi.fn();
    bus.subscribe({ taskType: "TAX_NEXUS" }, handler);

    await bus.publish(
      createAgentMessage({
        agentId: "tax-nexus-agent",
        taskType: "TAX_NEXUS",
        context: { clientId: "client-123", fiscalYear: "2025" },
        data: { exposure: 98000 },
        priority: "MEDIUM",
        autonomyLevel: "ADVISORY",
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should respect minimum priority filters", async () => {
    const handler = vi.fn();
    bus.subscribe({ minimumPriority: "HIGH" }, handler);

    await bus.publish(
      createAgentMessage({
        agentId: "audit-risk-agent",
        taskType: "RISK_ASSESS",
        context: { clientId: "client-456", fiscalYear: "2025" },
        data: { score: 0.2 },
        priority: "LOW",
        autonomyLevel: "ADVISORY",
      })
    );

    await bus.publish(
      createAgentMessage({
        agentId: "audit-risk-agent",
        taskType: "RISK_ASSESS",
        context: { clientId: "client-456", fiscalYear: "2025" },
        data: { score: 0.8 },
        priority: "HIGH",
        autonomyLevel: "HUMAN_REVIEW",
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should allow unsubscribe", async () => {
    const handler = vi.fn();
    const unsubscribe = bus.subscribe({ taskType: "RESEARCH" }, handler);

    unsubscribe();

    await bus.publish(
      createAgentMessage({
        agentId: "research-agent",
        taskType: "RESEARCH",
        context: { clientId: "client-789", fiscalYear: "2025" },
        data: { query: "tax code" },
        priority: "MEDIUM",
        autonomyLevel: "ADVISORY",
      })
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it("should capture handler errors", async () => {
    bus.subscribe({ taskType: "COMPLIANCE_CHECK" }, () => {
      throw new Error("boom");
    });

    const result = await bus.publish(
      createAgentMessage({
        agentId: "compliance-agent",
        taskType: "COMPLIANCE_CHECK",
        context: { clientId: "client-001", fiscalYear: "2025" },
        data: { status: "review-required" },
        priority: "CRITICAL",
        autonomyLevel: "HUMAN_REVIEW",
      })
    );

    expect(result.failed).toBe(1);
    expect(result.errors[0].error).toContain("boom");
  });
});
