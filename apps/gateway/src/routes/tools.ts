/**
 * Tool API Routes
 * 
 * Handles CRUD operations for agent tools including:
 * - Create, read, update, delete tools
 * - Test tool execution
 * - Tool assignment to agents
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ToolService } from '../services/ToolService.js';
import {
  CreateToolInputSchema,
  UpdateToolInputSchema,
  ToolFiltersSchema,
  ToolTestInputSchema,
  ToolAssignmentInputSchema,
  ToolAssignmentUpdateSchema,
} from '../schemas/tool.schema.js';

export function createToolRouter(supabase: SupabaseClient): Router {
  const router = Router();
  const toolService = new ToolService(supabase);

  // Error handler helper
  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * POST /api/v1/tools
   * Create a new tool
   */
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = CreateToolInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const tool = await toolService.create(parseResult.data);
    res.status(201).json(tool);
  }));

  /**
   * GET /api/v1/tools
   * List tools with filters and pagination
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const filters = ToolFiltersSchema.parse({
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      page_size: req.query.page_size ? parseInt(req.query.page_size as string) : undefined,
      category: req.query.category,
      search: req.query.search,
      organization_id: req.query.organization_id,
    });

    const result = await toolService.list(filters);
    res.json({
      tools: result.items,
      total: result.total,
      page: result.page,
      page_size: result.page_size,
    });
  }));

  /**
   * GET /api/v1/tools/:id
   * Get a single tool by ID
   */
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const tool = await toolService.getById(req.params.id);
    if (!tool) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }
    res.json(tool);
  }));

  /**
   * PATCH /api/v1/tools/:id
   * Update an existing tool
   */
  router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = UpdateToolInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const tool = await toolService.update(req.params.id, parseResult.data);
    res.json(tool);
  }));

  /**
   * DELETE /api/v1/tools/:id
   * Delete (deprecate) a tool
   */
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await toolService.delete(req.params.id);
    res.status(204).send();
  }));

  /**
   * POST /api/v1/tools/:id/test
   * Test tool execution
   */
  router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = ToolTestInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const result = await toolService.test(req.params.id, parseResult.data.params);
    res.json(result);
  }));

  return router;
}

// Agent-tool assignment routes
export function createAgentToolRouter(supabase: SupabaseClient): Router {
  const router = Router({ mergeParams: true });
  const toolService = new ToolService(supabase);

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * GET /api/v1/agents/:agentId/tools
   * Get all tools assigned to an agent
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const tools = await toolService.getAgentTools(agentId);
    res.json(tools);
  }));

  /**
   * POST /api/v1/agents/:agentId/tools
   * Assign a tool to an agent
   */
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    
    const parseResult = ToolAssignmentInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    await toolService.assignToAgent(agentId, parseResult.data.tool_id, parseResult.data.config);
    res.status(201).json({ message: 'Tool assigned successfully' });
  }));

  /**
   * PATCH /api/v1/agents/:agentId/tools/:toolId
   * Update tool assignment configuration
   */
  router.patch('/:toolId', asyncHandler(async (req: Request, res: Response) => {
    const { agentId, toolId } = req.params;
    
    const parseResult = ToolAssignmentUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    await toolService.updateAssignment(agentId, toolId, parseResult.data.config);
    res.json({ message: 'Tool assignment updated successfully' });
  }));

  /**
   * DELETE /api/v1/agents/:agentId/tools/:toolId
   * Remove a tool from an agent
   */
  router.delete('/:toolId', asyncHandler(async (req: Request, res: Response) => {
    const { agentId, toolId } = req.params;
    await toolService.removeFromAgent(agentId, toolId);
    res.status(204).send();
  }));

  return router;
}
