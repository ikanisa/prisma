/**
 * Example: Using Agent Registry in Next.js Server Actions
 */

import { agentRouter } from "@prisma-glow/agents";
import type { UnifiedRunOptions } from "@prisma-glow/agents";

/**
 * Server action to run an agent
 * Usage in Next.js app:
 * 
 * import { runAgentAction } from "@/actions/agents";
 * const result = await runAgentAction("tax-compliance-mt-034", "What are Malta tax deadlines?");
 */
export async function runAgentAction(
  agentId: string,
  message: string,
  jurisdictionCode?: string
) {
  "use server";

  try {
    const options: UnifiedRunOptions = {
      agentId,
      input: message,
      metadata: {
        jurisdictionCode,
      },
    };

    const result = await agentRouter.run(options);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Agent execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Agent execution failed",
    };
  }
}

/**
 * Server action to search agents
 */
export async function searchAgentsAction(params: {
  category?: string;
  jurisdiction?: string;
  tags?: string[];
}) {
  "use server";

  try {
    const agents = agentRouter.searchAgents(params);

    return {
      success: true,
      data: agents,
      count: agents.length,
    };
  } catch (error) {
    console.error("Agent search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
      data: [],
      count: 0,
    };
  }
}

/**
 * Server action to get agent details
 */
export async function getAgentAction(agentId: string) {
  "use server";

  try {
    const agent = agentRouter.getAgent(agentId);

    if (!agent) {
      return {
        success: false,
        error: "Agent not found",
      };
    }

    return {
      success: true,
      data: agent,
    };
  } catch (error) {
    console.error("Get agent error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get agent",
    };
  }
}

/**
 * Server action to list all agents
 */
export async function listAgentsAction() {
  "use server";

  try {
    const agents = agentRouter.listAgents();

    // Group by category for easier UI consumption
    const grouped = agents.reduce(
      (acc, agent) => {
        if (!acc[agent.category]) {
          acc[agent.category] = [];
        }
        acc[agent.category].push(agent);
        return acc;
      },
      {} as Record<string, typeof agents>
    );

    return {
      success: true,
      data: {
        all: agents,
        grouped,
      },
      count: agents.length,
    };
  } catch (error) {
    console.error("List agents error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list agents",
      data: { all: [], grouped: {} },
      count: 0,
    };
  }
}
