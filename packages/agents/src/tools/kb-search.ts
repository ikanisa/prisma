/**
 * KB Search Tool for AI Agents
 * 
 * Grounded retrieval tool that requires citations for accounting/tax questions
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Types for retrieval (inlined to avoid cross-package imports)
interface RetrievalChunk {
    chunkId: string;
    documentId: string;
    documentName: string;
    content: string;
    headingPath: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    score: number;
    standard: string | null;
    jurisdiction: string | null;
}

interface RetrievalFilters {
    standard?: 'IFRS' | 'ISA' | 'GAAP' | 'TAX' | 'AUDIT_METHODOLOGY' | 'COMPANY_LAW';
    jurisdiction?: string;
    docType?: string;
}

interface RetrievalResult {
    chunks: RetrievalChunk[];
    meta: {
        totalCandidates: number;
        durationMs: number;
    };
}

export interface KbSearchToolInput {
    query: string;
    filters?: RetrievalFilters;
    topK?: number;
}

export interface KbSearchToolOutput {
    chunks: Array<{
        documentName: string;
        content: string;
        pages: string;
        headingPath: string | null;
        score: number;
    }>;
    citations: string[];
    groundedPrompt: string;
    meta: {
        totalCandidates: number;
        durationMs: number;
    };
}

export interface KbSearchToolContext {
    tenantId: string;
    userRole: 'READONLY' | 'CLIENT' | 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'PARTNER' | 'SYSTEM_ADMIN';
    supabase: SupabaseClient;
    openai: OpenAI;
}

/**
 * Tool definition for agent registry
 */
export const KB_SEARCH_TOOL_DEFINITION = {
    name: 'kb_search',
    description: `Search the Knowledge Base for accounting and tax information. 
  
IMPORTANT: For any accounting, tax, IFRS, ISA, or regulatory questions:
- ALWAYS call this tool first
- Use the returned citations in your response
- Never invent tax rates or accounting rules without citing sources
- If no relevant results found, acknowledge uncertainty`,

    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query for finding relevant documents',
            },
            filters: {
                type: 'object',
                description: 'Optional filters to narrow search',
                properties: {
                    standard: {
                        type: 'string',
                        enum: ['IFRS', 'ISA', 'GAAP', 'TAX', 'AUDIT_METHODOLOGY', 'COMPANY_LAW'],
                        description: 'Filter by accounting/audit standard type',
                    },
                    jurisdiction: {
                        type: 'string',
                        description: 'Filter by jurisdiction (e.g., Malta, Rwanda, EU, US)',
                    },
                    docType: {
                        type: 'string',
                        description: 'Filter by document type (LAW, REGULATION, STANDARD, GUIDANCE)',
                    },
                },
            },
            topK: {
                type: 'number',
                description: 'Number of results to return (default: 5)',
            },
        },
        required: ['query'],
    },
};

/**
 * Execute KB search via pgvector
 */
async function performKbSearch(
    query: string,
    options: {
        tenantId: string;
        userRole: string;
        filters?: RetrievalFilters;
        topK?: number;
    },
    clients: { supabase: SupabaseClient; openai: OpenAI }
): Promise<RetrievalResult> {
    const startTime = Date.now();
    const topK = options.topK || 5;

    // Generate query embedding
    const embeddingResponse = await clients.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Build filter conditions
    const filterConditions: string[] = [`tenant_id = '${options.tenantId}'`];

    if (options.filters?.standard) {
        filterConditions.push(`standard = '${options.filters.standard}'`);
    }
    if (options.filters?.jurisdiction) {
        filterConditions.push(`jurisdiction = '${options.filters.jurisdiction}'`);
    }

    // Execute vector search via RPC
    const { data, error } = await clients.supabase.rpc('kb_search', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: topK * 2,
        p_tenant_id: options.tenantId,
        p_user_role: options.userRole,
    });

    if (error) {
        console.error('KB search error:', error);
        return { chunks: [], meta: { totalCandidates: 0, durationMs: Date.now() - startTime } };
    }

    // Map results to chunks
    const chunks: RetrievalChunk[] = (data || []).slice(0, topK).map((row: Record<string, unknown>) => ({
        chunkId: row.chunk_id as string,
        documentId: row.document_id as string,
        documentName: row.document_name as string,
        content: row.content as string,
        headingPath: row.heading_path as string | null,
        pageStart: row.page_start as number | null,
        pageEnd: row.page_end as number | null,
        score: row.similarity as number,
        standard: row.standard as string | null,
        jurisdiction: row.jurisdiction as string | null,
    }));

    return {
        chunks,
        meta: {
            totalCandidates: data?.length || 0,
            durationMs: Date.now() - startTime,
        },
    };
}

/**
 * Execute KB search tool
 */
export async function executeKbSearch(
    input: KbSearchToolInput,
    context: KbSearchToolContext
): Promise<KbSearchToolOutput> {
    const result = await performKbSearch(
        input.query,
        {
            tenantId: context.tenantId,
            userRole: context.userRole,
            filters: input.filters,
            topK: input.topK || 5,
        },
        {
            supabase: context.supabase,
            openai: context.openai,
        }
    );

    // P1-5 FIX: Log to audit trail for compliance
    try {
        await context.supabase.from('kb_audit_trail').insert({
            tenant_id: context.tenantId,
            user_role: context.userRole,
            query: input.query,
            filters: input.filters || {},
            result_count: result.chunks.length,
            top_document_ids: result.chunks.slice(0, 3).map((c: RetrievalChunk) => c.documentId),
            duration_ms: result.meta.durationMs,
            created_at: new Date().toISOString(),
        });
    } catch (auditError) {
        console.error('KB audit trail insert failed:', auditError);
        // Non-blocking - don't fail search if audit fails
    }

    // Format citations
    const citations = result.chunks.map((chunk: RetrievalChunk) => {
        const pages = formatPageRange(chunk.pageStart, chunk.pageEnd);
        return `[${chunk.documentName}, ${pages}]`;
    });

    // Build grounded prompt
    const groundedPrompt = buildGroundedPrompt(input.query, result.chunks);

    return {
        chunks: result.chunks.map((chunk: RetrievalChunk) => ({
            documentName: chunk.documentName,
            content: chunk.content,
            pages: formatPageRange(chunk.pageStart, chunk.pageEnd),
            headingPath: chunk.headingPath,
            score: chunk.score,
        })),
        citations,
        groundedPrompt,
        meta: {
            totalCandidates: result.meta.totalCandidates,
            durationMs: result.meta.durationMs,
        },
    };
}

/**
 * Format page range
 */
function formatPageRange(start: number | null, end: number | null): string {
    if (start === null && end === null) return 'N/A';
    if (start === end || end === null) return `p. ${start}`;
    return `pp. ${start}-${end}`;
}

/**
 * Build grounded prompt with context
 */
function buildGroundedPrompt(query: string, chunks: RetrievalChunk[]): string {
    if (chunks.length === 0) {
        return `No relevant documents found for: "${query}". Please acknowledge uncertainty.`;
    }

    const contextParts = chunks.map((chunk: RetrievalChunk, i: number) => {
        const pages = formatPageRange(chunk.pageStart, chunk.pageEnd);
        return `[${i + 1}] ${chunk.documentName} (${pages}):\n${chunk.content}`;
    });

    return `Answer based ONLY on these sources. Cite using [N] format.

${contextParts.join('\n\n')}

Question: ${query}`;
}

/**
 * Register KB search tool with agent system
 */
export function registerKbSearchTool(registry: {
    register: (
        name: string,
        definition: object,
        handler: (input: KbSearchToolInput, context: KbSearchToolContext) => Promise<KbSearchToolOutput>
    ) => void;
}): void {
    registry.register(
        KB_SEARCH_TOOL_DEFINITION.name,
        KB_SEARCH_TOOL_DEFINITION,
        executeKbSearch
    );
}
