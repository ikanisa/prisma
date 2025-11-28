/**
 * Persona API Routes
 * 
 * Handles CRUD operations for agent personas including:
 * - Create, read, update, delete personas
 * - Activate/deactivate personas
 * - Test persona with sample input
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PersonaService } from '../services/PersonaService.js';
import {
  CreatePersonaInputSchema,
  UpdatePersonaInputSchema,
  TestPersonaInputSchema,
} from '../schemas/persona.schema.js';

export function createPersonaRouter(supabase: SupabaseClient): Router {
  const router = Router({ mergeParams: true }); // mergeParams to access :agentId
  const personaService = new PersonaService(supabase);

  // Error handler helper
  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * POST /api/v1/agents/:agentId/personas
   * Create a new persona for an agent
   */
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    
    const parseResult = CreatePersonaInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const persona = await personaService.create(agentId, parseResult.data);
    res.status(201).json(persona);
  }));

  /**
   * GET /api/v1/agents/:agentId/personas
   * List all personas for an agent
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const personas = await personaService.listByAgentId(agentId);
    res.json(personas);
  }));

  /**
   * GET /api/v1/agents/:agentId/personas/:personaId
   * Get a single persona by ID
   */
  router.get('/:personaId', asyncHandler(async (req: Request, res: Response) => {
    const persona = await personaService.getById(req.params.personaId);
    if (!persona) {
      res.status(404).json({ error: 'Persona not found' });
      return;
    }
    res.json(persona);
  }));

  /**
   * PATCH /api/v1/agents/:agentId/personas/:personaId
   * Update an existing persona
   */
  router.patch('/:personaId', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = UpdatePersonaInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const persona = await personaService.update(req.params.personaId, parseResult.data);
    res.json(persona);
  }));

  /**
   * DELETE /api/v1/agents/:agentId/personas/:personaId
   * Delete a persona
   */
  router.delete('/:personaId', asyncHandler(async (req: Request, res: Response) => {
    await personaService.delete(req.params.personaId);
    res.status(204).send();
  }));

  /**
   * POST /api/v1/agents/:agentId/personas/:personaId/activate
   * Activate a persona (set as the active persona)
   */
  router.post('/:personaId/activate', asyncHandler(async (req: Request, res: Response) => {
    const persona = await personaService.activate(req.params.personaId);
    res.json(persona);
  }));

  /**
   * POST /api/v1/agents/:agentId/personas/:personaId/test
   * Test a persona with sample input
   */
  router.post('/:personaId/test', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = TestPersonaInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const result = await personaService.test(req.params.personaId, parseResult.data.input_text);
    res.json(result);
  }));

  /**
   * GET /api/v1/agents/:agentId/personas/:personaId/history
   * Get version history for a persona
   */
  router.get('/:personaId/history', asyncHandler(async (req: Request, res: Response) => {
    const history = await personaService.getVersionHistory(req.params.personaId);
    res.json(history);
  }));

  return router;
}

// Standalone persona routes (for /api/v1/personas/:id endpoints)
export function createStandalonePersonaRouter(supabase: SupabaseClient): Router {
  const router = Router();
  const personaService = new PersonaService(supabase);

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * GET /api/v1/personas/:id
   * Get a persona by ID (standalone route)
   */
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const persona = await personaService.getById(req.params.id);
    if (!persona) {
      res.status(404).json({ error: 'Persona not found' });
      return;
    }
    res.json(persona);
  }));

  /**
   * PATCH /api/v1/personas/:id
   * Update a persona (standalone route)
   */
  router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = UpdatePersonaInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const persona = await personaService.update(req.params.id, parseResult.data);
    res.json(persona);
  }));

  /**
   * DELETE /api/v1/personas/:id
   * Delete a persona (standalone route)
   */
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await personaService.delete(req.params.id);
    res.status(204).send();
  }));

  /**
   * POST /api/v1/personas/:id/activate
   * Activate a persona (standalone route)
   */
  router.post('/:id/activate', asyncHandler(async (req: Request, res: Response) => {
    const persona = await personaService.activate(req.params.id);
    res.json(persona);
  }));

  /**
   * POST /api/v1/personas/:id/test
   * Test a persona (standalone route)
   */
  router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = TestPersonaInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const result = await personaService.test(req.params.id, parseResult.data.input_text);
    res.json(result);
  }));

  return router;
}
