/**
 * Knowledge API Routes
 * 
 * Handles CRUD operations for knowledge sources including:
 * - Create, read, update, delete knowledge sources
 * - Trigger sync operations
 * - Assign knowledge sources to agents
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Knowledge source schemas
const KnowledgeSourceTypeSchema = z.enum([
  'document',
  'database',
  'api',
  'website',
  'manual',
]);

const CreateKnowledgeSourceSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  source_type: KnowledgeSourceTypeSchema,
  source_config: z.record(z.unknown()),
  embedding_model: z.string().default('text-embedding-3-small'),
  chunk_size: z.number().int().positive().default(1000),
  chunk_overlap: z.number().int().min(0).default(200),
  sync_frequency: z.enum(['manual', 'hourly', 'daily', 'weekly']).default('manual'),
});

const UpdateKnowledgeSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  source_config: z.record(z.unknown()).optional(),
  embedding_model: z.string().optional(),
  chunk_size: z.number().int().positive().optional(),
  chunk_overlap: z.number().int().min(0).optional(),
  sync_frequency: z.enum(['manual', 'hourly', 'daily', 'weekly']).optional(),
});

const KnowledgeFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(20),
  source_type: KnowledgeSourceTypeSchema.optional(),
  organization_id: z.string().uuid().optional(),
});

const KnowledgeAssignmentSchema = z.object({
  knowledge_source_id: z.string().uuid(),
  retrieval_strategy: z.enum(['similarity', 'keyword', 'hybrid']).default('similarity'),
  top_k: z.number().int().positive().default(5),
  similarity_threshold: z.number().min(0).max(1).default(0.7),
  priority: z.number().int().min(0).default(0),
});

export function createKnowledgeRouter(supabase: SupabaseClient): Router {
  const router = Router();

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * POST /api/v1/knowledge-sources
   * Create a new knowledge source
   */
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = CreateKnowledgeSourceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const { data: source, error } = await supabase
      .from('knowledge_sources')
      .insert({
        ...parseResult.data,
        sync_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create knowledge source: ${error.message}`);
    }

    res.status(201).json(source);
  }));

  /**
   * GET /api/v1/knowledge-sources
   * List knowledge sources with filters
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const filters = KnowledgeFiltersSchema.parse({
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      page_size: req.query.page_size ? parseInt(req.query.page_size as string) : undefined,
      source_type: req.query.source_type,
      organization_id: req.query.organization_id,
    });

    let query = supabase
      .from('knowledge_sources')
      .select('*', { count: 'exact' });

    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id);
    }

    if (filters.source_type) {
      query = query.eq('source_type', filters.source_type);
    }

    const from = (filters.page - 1) * filters.page_size;
    const to = from + filters.page_size - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to list knowledge sources: ${error.message}`);
    }

    res.json({
      sources: data,
      total: count,
      page: filters.page,
      page_size: filters.page_size,
    });
  }));

  /**
   * GET /api/v1/knowledge-sources/:id
   * Get a single knowledge source
   */
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Knowledge source not found' });
        return;
      }
      throw new Error(`Failed to get knowledge source: ${error.message}`);
    }

    res.json(data);
  }));

  /**
   * PATCH /api/v1/knowledge-sources/:id
   * Update a knowledge source
   */
  router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
    const parseResult = UpdateKnowledgeSourceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const { data, error } = await supabase
      .from('knowledge_sources')
      .update({
        ...parseResult.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update knowledge source: ${error.message}`);
    }

    res.json(data);
  }));

  /**
   * DELETE /api/v1/knowledge-sources/:id
   * Delete a knowledge source
   */
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { error } = await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      throw new Error(`Failed to delete knowledge source: ${error.message}`);
    }

    res.status(204).send();
  }));

  /**
   * POST /api/v1/knowledge-sources/:id/sync
   * Trigger a sync for a knowledge source
   */
  router.post('/:id/sync', asyncHandler(async (req: Request, res: Response) => {
    // Update sync status to 'syncing'
    const { data, error } = await supabase
      .from('knowledge_sources')
      .update({
        sync_status: 'syncing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to trigger sync: ${error.message}`);
    }

    // TODO: Trigger actual sync job (e.g., queue a background job)
    // For now, simulate completion after a short delay
    setTimeout(async () => {
      await supabase
        .from('knowledge_sources')
        .update({
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', req.params.id);
    }, 5000);

    res.json({
      message: 'Sync triggered successfully',
      source: data,
    });
  }));

  return router;
}

// Agent-knowledge assignment routes
export function createAgentKnowledgeRouter(supabase: SupabaseClient): Router {
  const router = Router({ mergeParams: true });

  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * GET /api/v1/agents/:agentId/knowledge
   * Get all knowledge sources assigned to an agent
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;

    const { data, error } = await supabase
      .from('agent_knowledge_assignments')
      .select(`
        retrieval_strategy,
        top_k,
        similarity_threshold,
        priority,
        knowledge_sources (*)
      `)
      .eq('agent_id', agentId)
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(`Failed to get agent knowledge sources: ${error.message}`);
    }

    const sources = (data || []).map((row: any) => ({
      ...row.knowledge_sources,
      assignment: {
        retrieval_strategy: row.retrieval_strategy,
        top_k: row.top_k,
        similarity_threshold: row.similarity_threshold,
        priority: row.priority,
      },
    }));

    res.json(sources);
  }));

  /**
   * POST /api/v1/agents/:agentId/knowledge
   * Assign a knowledge source to an agent
   */
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    
    const parseResult = KnowledgeAssignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.issues,
      });
      return;
    }

    const { error } = await supabase
      .from('agent_knowledge_assignments')
      .upsert({
        agent_id: agentId,
        ...parseResult.data,
      }, {
        onConflict: 'agent_id,knowledge_source_id',
      });

    if (error) {
      throw new Error(`Failed to assign knowledge source: ${error.message}`);
    }

    res.status(201).json({ message: 'Knowledge source assigned successfully' });
  }));

  /**
   * PATCH /api/v1/agents/:agentId/knowledge/:sourceId
   * Update knowledge assignment configuration
   */
  router.patch('/:sourceId', asyncHandler(async (req: Request, res: Response) => {
    const { agentId, sourceId } = req.params;

    const { error } = await supabase
      .from('agent_knowledge_assignments')
      .update(req.body)
      .eq('agent_id', agentId)
      .eq('knowledge_source_id', sourceId);

    if (error) {
      throw new Error(`Failed to update knowledge assignment: ${error.message}`);
    }

    res.json({ message: 'Knowledge assignment updated successfully' });
  }));

  /**
   * DELETE /api/v1/agents/:agentId/knowledge/:sourceId
   * Remove a knowledge source from an agent
   */
  router.delete('/:sourceId', asyncHandler(async (req: Request, res: Response) => {
    const { agentId, sourceId } = req.params;

    const { error } = await supabase
      .from('agent_knowledge_assignments')
      .delete()
      .eq('agent_id', agentId)
      .eq('knowledge_source_id', sourceId);

    if (error) {
      throw new Error(`Failed to remove knowledge source: ${error.message}`);
    }

    res.status(204).send();
  }));

  return router;
}
