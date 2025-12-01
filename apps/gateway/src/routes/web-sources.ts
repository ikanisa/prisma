/**
 * Deep Search Sources API Routes
 * Handles CRUD for web knowledge sources with auto-classification
 */

import { Router, Request, Response, NextFunction } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { classifyWebSource } from "../../../services/rag/knowledge/classification";

// Validation schemas
const CreateWebSourceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  base_url: z.string().url(),
  source_type: z
    .enum([
      "ifrs_foundation",
      "iaasb",
      "acca",
      "cpa",
      "oecd",
      "tax_authority",
      "gaap",
      "gazette",
      "regulatory_pdf",
      "company_policy",
      "big_four",
      "academic",
    ])
    .optional(),
  verification_level: z.enum(["primary", "secondary", "tertiary"]).optional(),
  source_priority: z
    .enum(["authoritative", "regulatory", "interpretive", "supplementary"])
    .optional(),
  jurisdictions: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  sync_enabled: z.boolean().default(false),
  sync_frequency_hours: z.number().int().positive().default(168),
  
  // Optional metadata for classification
  page_title: z.string().optional(),
  page_snippet: z.string().optional(),
  
  // Allow manual classification to override auto-classification
  force_manual: z.boolean().default(false),
});

const UpdateWebSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  source_type: z
    .enum([
      "ifrs_foundation",
      "iaasb",
      "acca",
      "cpa",
      "oecd",
      "tax_authority",
      "gaap",
      "gazette",
      "regulatory_pdf",
      "company_policy",
      "big_four",
      "academic",
    ])
    .optional(),
  verification_level: z.enum(["primary", "secondary", "tertiary"]).optional(),
  source_priority: z
    .enum(["authoritative", "regulatory", "interpretive", "supplementary"])
    .optional(),
  jurisdictions: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  sync_enabled: z.boolean().optional(),
  sync_frequency_hours: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

const ListFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(20),
  source_type: z.string().optional(),
  verification_level: z.enum(["primary", "secondary", "tertiary"]).optional(),
  jurisdiction: z.string().optional(),
  is_active: z.boolean().optional(),
  auto_classified: z.boolean().optional(),
});

export function createWebSourcesRouter(supabase: SupabaseClient): Router {
  const router = Router();

  const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * POST /api/v1/web-sources
   * Create a new web knowledge source with auto-classification
   */
  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const parseResult = CreateWebSourceSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
        return;
      }

      const {
        name,
        description,
        base_url,
        page_title,
        page_snippet,
        force_manual,
        ...restData
      } = parseResult.data;

      let finalData = {
        name,
        description,
        base_url,
        ...restData,
      };

      // Auto-classify if not manually overridden
      if (!force_manual) {
        try {
          const classification = await classifyWebSource(
            {
              url: base_url,
              pageTitle: page_title,
              pageSnippet: page_snippet,
            },
            {
              heuristicOnly: !process.env.OPENAI_API_KEY, // Skip LLM if no API key
            }
          );

          // Merge classification with provided data (provided data takes precedence)
          finalData = {
            ...finalData,
            source_type: restData.source_type || classification.sourceType,
            verification_level:
              restData.verification_level || classification.verificationLevel,
            source_priority:
              restData.source_priority || classification.sourcePriority,
            jurisdictions:
              restData.jurisdictions ||
              (classification.jurisdictionCode
                ? [classification.jurisdictionCode]
                : []),
            domains:
              restData.domains ||
              (classification.tags.length > 0
                ? [classification.category.toLowerCase()]
                : []),
            auto_classified: true,
            classification_confidence: classification.confidence,
            classification_source: classification.source,
          };
        } catch (error) {
          console.error("Auto-classification failed:", error);
          // Continue without classification
          finalData = {
            ...finalData,
            auto_classified: false,
            classification_source: "MANUAL",
          };
        }
      } else {
        finalData = {
          ...finalData,
          auto_classified: false,
          classification_source: "MANUAL",
        };
      }

      const { data: source, error } = await supabase
        .from("deep_search_sources")
        .insert(finalData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create web source: ${error.message}`);
      }

      res.status(201).json(source);
    })
  );

  /**
   * GET /api/v1/web-sources
   * List web sources with filters
   */
  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const filters = ListFiltersSchema.parse({
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        page_size: req.query.page_size
          ? parseInt(req.query.page_size as string)
          : undefined,
        source_type: req.query.source_type,
        verification_level: req.query.verification_level,
        jurisdiction: req.query.jurisdiction,
        is_active:
          req.query.is_active !== undefined
            ? req.query.is_active === "true"
            : undefined,
        auto_classified:
          req.query.auto_classified !== undefined
            ? req.query.auto_classified === "true"
            : undefined,
      });

      let query = supabase
        .from("deep_search_sources")
        .select("*", { count: "exact" });

      if (filters.source_type) {
        query = query.eq("source_type", filters.source_type);
      }

      if (filters.verification_level) {
        query = query.eq("verification_level", filters.verification_level);
      }

      if (filters.jurisdiction) {
        query = query.contains("jurisdictions", [filters.jurisdiction]);
      }

      if (filters.is_active !== undefined) {
        query = query.eq("is_active", filters.is_active);
      }

      if (filters.auto_classified !== undefined) {
        query = query.eq("auto_classified", filters.auto_classified);
      }

      const from = (filters.page - 1) * filters.page_size;
      const to = from + filters.page_size - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to list web sources: ${error.message}`);
      }

      res.json({
        sources: data,
        total: count,
        page: filters.page,
        page_size: filters.page_size,
      });
    })
  );

  /**
   * GET /api/v1/web-sources/:id
   * Get a single web source
   */
  router.get(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { data, error } = await supabase
        .from("deep_search_sources")
        .select("*")
        .eq("id", req.params.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          res.status(404).json({ error: "Web source not found" });
          return;
        }
        throw new Error(`Failed to get web source: ${error.message}`);
      }

      res.json(data);
    })
  );

  /**
   * PATCH /api/v1/web-sources/:id
   * Update a web source
   * Note: Manual edits reset auto_classified to false
   */
  router.patch(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const parseResult = UpdateWebSourceSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
        return;
      }

      // Manual edits reset auto-classification
      const updateData = {
        ...parseResult.data,
        auto_classified: false,
        classification_source: "MANUAL",
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("deep_search_sources")
        .update(updateData)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update web source: ${error.message}`);
      }

      res.json(data);
    })
  );

  /**
   * POST /api/v1/web-sources/:id/reclassify
   * Re-run classification on an existing source
   */
  router.post(
    "/:id/reclassify",
    asyncHandler(async (req: Request, res: Response) => {
      // Fetch current source
      const { data: source, error: fetchError } = await supabase
        .from("deep_search_sources")
        .select("*")
        .eq("id", req.params.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch source: ${fetchError.message}`);
      }

      // Re-classify
      const classification = await classifyWebSource(
        {
          url: source.base_url,
          pageTitle: source.name,
        },
        {
          forceLLM: req.body.force_llm ?? false,
          heuristicOnly: !process.env.OPENAI_API_KEY,
        }
      );

      // Update with new classification
      const { data, error } = await supabase
        .from("deep_search_sources")
        .update({
          source_type: classification.sourceType,
          verification_level: classification.verificationLevel,
          source_priority: classification.sourcePriority,
          jurisdictions: classification.jurisdictionCode
            ? [classification.jurisdictionCode]
            : [],
          domains: [classification.category.toLowerCase()],
          auto_classified: true,
          classification_confidence: classification.confidence,
          classification_source: classification.source,
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to reclassify source: ${error.message}`);
      }

      res.json({
        source: data,
        classification,
      });
    })
  );

  /**
   * DELETE /api/v1/web-sources/:id
   * Delete a web source
   */
  router.delete(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { error } = await supabase
        .from("deep_search_sources")
        .delete()
        .eq("id", req.params.id);

      if (error) {
        throw new Error(`Failed to delete web source: ${error.message}`);
      }

      res.status(204).send();
    })
  );

  return router;
}
