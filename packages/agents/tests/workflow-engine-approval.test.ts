import { describe, it, expect, beforeEach, vi } from "vitest";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { HITLManager } from "../src/core/hitl-manager.js";
import { AgentMessageBus, type AgentMessage } from "../src/core/agent-message-bus.js";
import type { WorkflowDefinition } from "../src/core/types.js";
import type { AgentResponse } from "../src/orchestrator.js";

const workflowDefinition: WorkflowDefinition = {
  id: "approval-test-workflow",
  name: "Approval Test Workflow",
  version: "1.0.0",
  description: "Single approval gated task",
  defaultConfig: {
    maxParallelTasks: 1,
    globalTimeout: 5000,
    onFailure: "stop",
    checkpointOnComplete: false,
    notifyOnComplete: false,
  },
  tasks: [
    {
      id: "task-approval",
      name: "Approval Task",
      agentType: "tax",
      description: "Task requiring approval",
      dependencies: [],
      status: "pending",
      priority: 10,
      config: {
        requiresApproval: true,
        riskLevel: "high",
        tools: ["compute_income_tax"],
      },
      retryCount: 0,
      maxRetries: 0,
    },
  ],
};

const baseContext = {
  engagementId: "eng-1",
  engagementType: "tax" as const,
  jurisdiction: "MT" as const,
  clientId: "client-1",
  firmId: "firm-1",
  userId: "user-1",
  phase: "planning",
};

describe("WorkflowEngine approvals", () => {
  let hitl: HITLManager;
  let bus: AgentMessageBus;
  let messages: AgentMessage[];
  let executor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    hitl = new HITLManager({
      defaultSLA: { low: 5, medium: 5, high: 5, critical: 5 },
      autoApproveRiskLevels: [],
      escalationPath: { staff: "manager" },
      notificationChannels: ["inApp"],
    });
    bus = new AgentMessageBus();
    messages = [];
    bus.subscribe({}, (message) => {
      messages.push(message);
    });
    executor = vi.fn(async () =>
      ({
        runId: "run-1",
        traceId: "trace-1",
        status: "completed",
        agentType: "tax",
        response: { type: "text", content: "ok" },
        events: [],
      } satisfies AgentResponse)
    );
  });

  it("should pause workflow and request approval", async () => {
    const engine = new WorkflowEngine({ hitlManager: hitl, messageBus: bus, executor });
    engine.registerWorkflow(workflowDefinition);

    const instance = await engine.createInstance(workflowDefinition.id, baseContext);
    const result = await engine.run(instance.instanceId);

    expect(result.status).toBe("awaiting_approval");
    const approvals = hitl.getWorkflowApprovals(instance.instanceId);
    expect(approvals).toHaveLength(1);
    expect(messages.some((msg) => msg.taskType === "AUTONOMY_ALERT")).toBe(true);
  });

  it("should resume after approval", async () => {
    const engine = new WorkflowEngine({ hitlManager: hitl, messageBus: bus, executor });
    engine.registerWorkflow(workflowDefinition);

    const instance = await engine.createInstance(workflowDefinition.id, baseContext);
    await engine.run(instance.instanceId);

    const [approval] = hitl.getWorkflowApprovals(instance.instanceId);
    const result = await engine.approveTask(instance.instanceId, approval.id, "user-1", "LGTM");

    expect(result.status).toBe("completed");
    expect(executor).toHaveBeenCalled();
  });
});
