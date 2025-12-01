import { Express } from "express";
import agentRegistryRoutes from "../routes/agent-registry.js";

/**
 * Register agent registry routes with Express app
 * 
 * Usage:
 *   import { registerAgentRoutes } from "./integration/agents.js";
 *   registerAgentRoutes(app);
 */
export function registerAgentRoutes(app: Express): void {
  app.use("/api", agentRegistryRoutes);
  console.log("✓ Agent registry routes registered at /api/agents");
}

/**
 * Health check for agent registry system
 */
export async function agentRegistryHealthCheck(): Promise<{
  healthy: boolean;
  agentCount: number;
  categories: string[];
}> {
  try {
    const { loadAgentsRegistry } = await import("@prisma-glow/agents");
    const agents = loadAgentsRegistry();
    const categories = [...new Set(agents.map((a) => a.category))];

    return {
      healthy: true,
      agentCount: agents.length,
      categories,
    };
  } catch (error) {
    console.error("Agent registry health check failed:", error);
    return {
      healthy: false,
      agentCount: 0,
      categories: [],
    };
  }
}
