/**
 * KB Search Tool for AI Agents
 * 
 * Grounded retrieval tool that requires citations for accounting/tax questions
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
    retrieve,
    formatCitations,
    buildGroundedPrompt,
    type RetrievalOptions,
    type RetrievalFilters,
    type RetrievalResult,
} from '../../../services/rag/knowledge/retriever.js';

export interface KbSearchToolInput {
    query: string;
    filters?: {
        standard?: 'IFRS' | 'ISA' | 'GAAP' | 'TAX' | 'AUDIT_METHODOLOGY' | 'COMPANY_LAW';
        jurisdiction?: string;
        docType?: string;
    };
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
 * Execute KB search tool
 */
export async function executeKbSearch(
    input: KbSearchToolInput,
    context: KbSearchToolContext
): Promise<KbSearchToolOutput> {
    const options: RetrievalOptions = {
        tenantId: context.tenantId,
        userRole: context.userRole,
        filters: input.filters as RetrievalFilters | undefined,
        topK: input.topK || 5,
    };

    const result = await retrieve(input.query, options, {
        supabase: context.supabase,
        openai: context.openai,
    });

    const citations = formatCitations(result.chunks);
    const groundedPrompt = buildGroundedPrompt(input.query, result.chunks);

    return {
        chunks: result.chunks.map(chunk => ({
            documentName: chunk.documentName,
            content: chunk.content,
            pages: formatPageRange(chunk.pageStart, chunk.pageEnd),
            headingPath: chunk.headingPath,
            score: chunk.score,
        })),
        citations: citations.map(c => `[${c.documentName}, ${c.pages}]`),
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
 * Register KB search tool with agent system
 */
export function registerKbSearchTool(registry: {
    register: (
        name: string,
        definition: object,
        handler: (input: any, context: any) => Promise<any>
    ) => void;
}): void {
    registry.register(
        KB_SEARCH_TOOL_DEFINITION.name,
        KB_SEARCH_TOOL_DEFINITION,
        executeKbSearch
    );
}
