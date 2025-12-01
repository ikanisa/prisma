import express, { Request, Response } from "express";
import { agentRouter } from "@prisma-glow/agents";
import type { UnifiedRunOptions } from "@prisma-glow/agents";

const router = express.Router();

router.get("/agents", async (_req: Request, res: Response) => {
  try {
    const agents = agentRouter.listAgents();
    res.json({
      success: true,
      data: agents,
      count: agents.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list agents",
    });
  }
});

router.get("/agents/search", async (req: Request, res: Response) => {
  try {
    const { category, jurisdiction, tags } = req.query;
    const agents = agentRouter.searchAgents({
      category: category as string | undefined,
      jurisdiction: jurisdiction as string | undefined,
      tags: tags ? (tags as string).split(",") : undefined,
    });

    res.json({
      success: true,
      data: agents,
      count: agents.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    });
  }
});

router.get("/agents/:agentId", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = agentRouter.getAgent(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found",
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get agent",
    });
  }
});

router.post("/agents/:agentId/run", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { message, jurisdictionCode, forceEngine } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const options: UnifiedRunOptions = {
      agentId,
      input: message,
      metadata: {
        jurisdictionCode,
        userId: req.user?.id,
        sessionId: req.headers["x-session-id"] as string | undefined,
      },
      forceEngine,
    };

    const result = await agentRouter.run(options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Agent execution failed",
    });
  }
});

export default router;
