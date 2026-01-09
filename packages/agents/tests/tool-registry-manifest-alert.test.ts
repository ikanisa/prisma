import { describe, it, expect, beforeEach } from "vitest";
import { executeTool, toolRegistry } from "../src/tools/registry.js";
import { agentMessageBus, type AgentMessage } from "../src/core/agent-message-bus.js";
import type { Tool } from "../src/tools/types.js";

describe("tool registry manifest alerts", () => {
  const toolName = "test_manifest_missing";

  beforeEach(() => {
    agentMessageBus.clear();
    delete (toolRegistry as Record<string, Tool>)[toolName];
  });

  it("emits alert when deterministic manifest is missing", async () => {
    const messages: AgentMessage[] = [];
    agentMessageBus.subscribe({}, (message) => {
      messages.push(message);
    });

    toolRegistry[toolName] = {
      name: toolName,
      description: "Test tool without manifest",
      requiresManifest: true,
      async execute() {
        return { success: true, data: { ok: true } };
      },
    };

    const result = await executeTool(toolName, {}, { userId: "user-1", sessionId: "sess-1" });

    expect(result.metadata?.manifestMissing).toBe(true);
    expect(messages.some((msg) => msg.taskType === "AUTONOMY_ALERT")).toBe(true);
  });
});
