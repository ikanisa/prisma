/**
 * Specialist Agents API Routes
 * 
 * Routes for executing specialist agents (Tax, Audit, Accounting, Corporate)
 * with OpenAI/Gemini integration and tool calling
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAgentsRegistry } from '@prisma-glow/agents/registry/loader.js';
import { createOpenAIAgentFromRegistry } from '@prisma-glow/agents/openai/factory.js';
import { createGeminiConfigFromRegistry } from '@prisma-glow/agents/gemini/factory.js';
import { runOpenAIAgent } from '@prisma-glow/agents/openai/runner.js';
import { runGeminiAgent } from '@prisma-glow/agents/gemini/runner.js';
import { z } from 'zod';

// Request validation schemas
const ExecuteAgentSchema = z.object({
  message: z.string().min(1).max(5000),
  jurisdictionCode: z.string().optional(),
  sessionId: z.string().optional(),
});

const AutoRouteSchema = z.object({
  message: z.string().min(1).max(5000),
  context: z.object({
    jurisdictionCode: z.string().optional(),
    category: z.enum(['tax', 'audit', 'accounting', 'corporate']).optional(),
  }).optional(),
});

export function createSpecialistAgentsRouter(supabase: SupabaseClient): Router {
  const router = Router();
  const registry = loadAgentsRegistry();

  // Error handler helper
  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * GET /api/specialist-agents
   * List all available specialist agents
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { category, jurisdiction } = req.query;

    let agents = registry;

    // Filter by category if provided
    if (category && typeof category === 'string') {
      agents = agents.filter(a => a.category === category);
    }

    // Filter by jurisdiction if provided
    if (jurisdiction && typeof jurisdiction === 'string') {
      agents = agents.filter(a => 
        a.jurisdictions.includes(jurisdiction) || 
        a.jurisdictions.includes('GLOBAL')
      );
    }

    res.json({
      count: agents.length,
      agents: agents.map(a => ({
        id: a.id,
        category: a.category,
        name: a.name,
        description: a.description,
        jurisdictions: a.jurisdictions,
        tools: a.tools,
        engine: a.engine_preferences.primary,
        routingTags: a.routing_tags,
      })),
    });
  }));

  /**
   * GET /api/specialist-agents/:agentId
   * Get details of a specific specialist agent
   */
  router.get('/:agentId', asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const agent = registry.find(a => a.id === agentId);

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json(agent);
  }));

  /**
   * POST /api/specialist-agents/:agentId/execute
   * Execute a specialist agent with a user query
   */
  router.post('/:agentId/execute', asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    
    // Validate request body
    const parseResult = ExecuteAgentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const { message, jurisdictionCode, sessionId } = parseResult.data;

    // Find agent in registry
    const agentEntry = registry.find(a => a.id === agentId);
    if (!agentEntry) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Get user ID from auth context
    const userId = (req as any).userId || 'anonymous';

    try {
      // Determine engine (prefer primary, fallback if needed)
      const engine = agentEntry.engine_preferences.primary;

      let result;
      const startTime = Date.now();

      if (engine === 'openai') {
        const agent = createOpenAIAgentFromRegistry(agentEntry);
        result = await runOpenAIAgent(agent, {
          input: message,
          metadata: {
            jurisdictionCode,
            userId,
            sessionId: sessionId || `session-${Date.now()}`,
          },
        });
      } else {
        const config = createGeminiConfigFromRegistry(agentEntry);
        result = await runGeminiAgent(config, {
          input: message,
          metadata: {
            jurisdictionCode,
            userId,
            sessionId: sessionId || `session-${Date.now()}`,
          },
        });
      }

      const executionTime = Date.now() - startTime;

      // Log execution to Supabase
      await supabase.from('agent_executions').insert({
        agent_id: agentId,
        user_id: userId,
        session_id: sessionId,
        message,
        response: result.output,
        jurisdiction_code: jurisdictionCode,
        engine,
        tool_calls_count: result.toolCalls?.length || 0,
        execution_time_ms: executionTime,
        metadata: result.metadata,
      });

      res.json({
        agentId,
        engine,
        output: result.output,
        toolCalls: result.toolCalls,
        executionTime,
        metadata: result.metadata,
      });
    } catch (error) {
      console.error(`Agent execution failed for ${agentId}:`, error);
      
      res.status(500).json({
        error: 'Agent execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
    }
  }));

  /**
   * POST /api/specialist-agents/auto-route
   * Automatically route a query to the most appropriate agent
   */
  router.post('/auto-route', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = AutoRouteSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const { message, context } = parseResult.data;

    // Simple keyword-based routing (can be enhanced with ML later)
    const messageLower = message.toLowerCase();
    
    let selectedAgent = null;

    // Tax keywords
    if (messageLower.match(/tax|vat|compliance|return|filing|paye|payroll/)) {
      selectedAgent = registry.find(a => 
        a.category === 'tax' && 
        (!context?.jurisdictionCode || a.jurisdictions.includes(context.jurisdictionCode))
      );
    }
    // Audit keywords
    else if (messageLower.match(/audit|assurance|materiality|risk|isa|ifrs/)) {
      selectedAgent = registry.find(a => a.category === 'audit');
    }
    // Accounting keywords
    else if (messageLower.match(/accounting|ifrs|gaap|financial statement|depreciation/)) {
      selectedAgent = registry.find(a => a.category === 'accounting');
    }
    // Corporate keywords
    else if (messageLower.match(/corporate|company|director|shareholder|kyc|licence/)) {
      selectedAgent = registry.find(a => a.category === 'corporate');
    }

    if (!selectedAgent) {
      res.status(400).json({
        error: 'Unable to route query',
        message: 'Could not determine appropriate agent. Please specify agent ID directly.',
        suggestion: 'Try using a more specific query or selecting an agent manually.',
      });
      return;
    }

    res.json({
      selectedAgent: {
        id: selectedAgent.id,
        name: selectedAgent.name,
        category: selectedAgent.category,
        reason: 'Matched based on query keywords',
      },
      message: 'Agent selected. Use POST /api/specialist-agents/:agentId/execute to proceed.',
    });
  }));

  return router;
}
