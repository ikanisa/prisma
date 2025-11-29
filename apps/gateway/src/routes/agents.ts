/**
 * Agent API Routes
 * 
 * Handles CRUD operations for AI agents including:
 * - Create, read, update, delete agents
 * - Duplicate and publish agents
 * - Test agent execution
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AgentService } from '../services/AgentService.js';
import {
  CreateAgentInputSchema,
  UpdateAgentInputSchema,
  AgentFiltersSchema,
  TestInputSchema,
  PublishInputSchema,
} from '../schemas/agent.schema.js';

export function createAgentRouter(supabase: SupabaseClient): Router {
  const router = Router();
  const agentService = new AgentService(supabase);

  // Error handler helper
  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * POST /api/v1/agents
   * Create a new agent
   */
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = CreateAgentInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    // Get user ID from auth context (set by middleware)
    const userId = (req as any).userId || 'system';

    const agent = await agentService.create(parseResult.data, userId);
    res.status(201).json(agent);
  }));

  /**
   * GET /api/v1/agents
   * List agents with filters and pagination
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const filters = AgentFiltersSchema.parse({
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      page_size: req.query.page_size ? parseInt(req.query.page_size as string) : undefined,
      type: req.query.type,
      status: req.query.status,
      search: req.query.search,
      organization_id: req.query.organization_id,
    });

    const result = await agentService.list(filters);
    res.json({
      agents: result.items,
      total: result.total,
      page: result.page,
      page_size: result.page_size,
    });
  }));

  /**
   * GET /api/v1/agents/:id
   * Get a single agent by ID
   */
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const agent = await agentService.getById(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(agent);
  }));

  /**
   * PATCH /api/v1/agents/:id
   * Update an existing agent
   */
  router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = UpdateAgentInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const agent = await agentService.update(req.params.id, parseResult.data);
    res.json(agent);
  }));

  /**
   * DELETE /api/v1/agents/:id
   * Delete (archive) an agent
   */
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await agentService.delete(req.params.id);
    res.status(204).send();
  }));

  /**
   * POST /api/v1/agents/:id/duplicate
   * Duplicate an existing agent
   */
  router.post('/:id/duplicate', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId || 'system';
    const agent = await agentService.duplicate(req.params.id, userId);
    res.status(201).json(agent);
  }));

  /**
   * POST /api/v1/agents/:id/publish
   * Publish an agent (set to active status)
   */
  router.post('/:id/publish', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = PublishInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const agent = await agentService.publish(req.params.id, parseResult.data.version);
    res.json(agent);
  }));

  /**
   * POST /api/v1/agents/:id/test
   * Test agent execution
   */
  router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = TestInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const result = await agentService.test(req.params.id, parseResult.data);
    res.json(result);
  }));

  /**
   * GET /api/v1/agents/:id/stats
   * Get agent execution statistics
   */
  router.get('/:id/stats', asyncHandler(async (req: Request, res: Response) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const stats = await agentService.getStats(req.params.id, days);
    res.json(stats);
  }));

  return router;
}
