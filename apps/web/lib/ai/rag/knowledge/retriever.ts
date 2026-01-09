/**
 * Knowledge Factory Retriever
 * 
 * Vector search with tenant isolation, confidentiality filtering, and citation formatting
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface RetrievalFilters {
    standard?: 'IFRS' | 'ISA' | 'GAAP' | 'TAX' | 'AUDIT_METHODOLOGY' | 'COMPANY_LAW' | 'OTHER';
    jurisdiction?: string;
    docType?: string;
    effectiveDateFrom?: string;
    effectiveDateTo?: string;
}

export interface RetrievalOptions {
    tenantId: string;
    userRole: 'READONLY' | 'CLIENT' | 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'PARTNER' | 'SYSTEM_ADMIN';
    filters?: RetrievalFilters;
    topK?: number;
    minScore?: number;
}

export interface RetrievedChunk {
    chunkId: string;
    documentId: string;
    documentName: string;
    content: string;
    headingPath: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    score: number;
    standard: string;
    jurisdiction: string;
    confidentiality: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';
}

export interface RetrievalResult {
    chunks: RetrievedChunk[];
    query: string;
    filters: RetrievalFilters;
    meta: {
        totalCandidates: number;
        embeddingModel: string;
        durationMs: number;
    };
}

export interface Citation {
    documentName: string;
    pages: string;
    chunkId: string;
    snippet: string;
}

const EMBEDDING_MODEL = process.env.KB_EMBEDDING_MODEL || 'text-embedding-3-small';
const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.5;

// Role hierarchy for confidentiality checks
const ROLE_HIERARCHY: Record<string, number> = {
    READONLY: 0,
    CLIENT: 1,
    EMPLOYEE: 2,
    MANAGER: 3,
    ADMIN: 4,
    PARTNER: 5,
    SYSTEM_ADMIN: 6,
};

/**
 * Retrieve relevant chunks for a query
 */
export async function retrieve(
    query: string,
    options: RetrievalOptions,
    deps: { supabase: SupabaseClient; openai: OpenAI }
): Promise<RetrievalResult> {
    const startTime = Date.now();
    const topK = options.topK || DEFAULT_TOP_K;
    const minScore = options.minScore || DEFAULT_MIN_SCORE;

    // Generate query embedding
    const embeddingResponse = await deps.openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Use database function for search with confidentiality filtering
    const { data, error } = await deps.supabase.rpc('kb_search', {
        p_tenant_id: options.tenantId,
        p_query_embedding: queryEmbedding,
        p_limit: topK * 2, // Fetch more for filtering
        p_standard: options.filters?.standard || null,
        p_jurisdiction: options.filters?.jurisdiction || null,
        p_doc_type: options.filters?.docType || null,
        p_min_score: minScore,
    });

    if (error) {
        throw new Error(`Retrieval failed: ${error.message}`);
    }

    // Filter by user role
    const chunks = (data || [])
        .filter((row: any) => canAccessConfidentiality(options.userRole, row.confidentiality))
        .slice(0, topK)
        .map((row: any): RetrievedChunk => ({
            chunkId: row.chunk_id,
            documentId: row.document_id,
            documentName: row.document_name,
            content: row.chunk_content,
            headingPath: row.heading_path,
            pageStart: row.page_start,
            pageEnd: row.page_end,
            score: row.score,
            standard: row.standard,
            jurisdiction: row.jurisdiction,
            confidentiality: row.confidentiality,
        }));

    // Log to audit trail
    await logAuditTrail(deps.supabase, {
        tenantId: options.tenantId,
        query,
        chunkIds: chunks.map(c => c.chunkId),
        documentIds: [...new Set(chunks.map(c => c.documentId))],
        scores: chunks.map(c => c.score),
        filters: options.filters || {},
    });

    return {
        chunks,
        query,
        filters: options.filters || {},
        meta: {
            totalCandidates: (data || []).length,
            embeddingModel: EMBEDDING_MODEL,
            durationMs: Date.now() - startTime,
        },
    };
}

/**
 * Check if user role can access confidentiality level
 */
function canAccessConfidentiality(
    userRole: string,
    confidentiality: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED'
): boolean {
    const roleLevel = ROLE_HIERARCHY[userRole] ?? 0;

    switch (confidentiality) {
        case 'PUBLIC':
            return true;
        case 'INTERNAL':
            return roleLevel >= ROLE_HIERARCHY.EMPLOYEE;
        case 'RESTRICTED':
            return roleLevel >= ROLE_HIERARCHY.MANAGER;
        default:
            return false;
    }
}

/**
 * Log retrieval to audit trail
 */
async function logAuditTrail(
    supabase: SupabaseClient,
    data: {
        tenantId: string;
        userId?: string;
        query: string;
        chunkIds: string[];
        documentIds: string[];
        scores: number[];
        filters: RetrievalFilters;
    }
): Promise<void> {
    try {
        await supabase.from('kb_audit_trail').insert({
            tenant_id: data.tenantId,
            user_id: data.userId || null,
            query: data.query,
            retrieved_chunk_ids: data.chunkIds,
            retrieved_document_ids: data.documentIds,
            retrieval_scores: data.scores,
            filters_applied: data.filters,
        });
    } catch (error) {
        // Log but don't fail on audit trail errors
        console.error('Failed to log audit trail:', error);
    }
}

/**
 * Format citations for response
 */
export function formatCitations(chunks: RetrievedChunk[]): Citation[] {
    return chunks.map(chunk => ({
        documentName: chunk.documentName,
        pages: formatPageRange(chunk.pageStart, chunk.pageEnd),
        chunkId: chunk.chunkId,
        snippet: chunk.content.substring(0, 150) + (chunk.content.length > 150 ? '...' : ''),
    }));
}

/**
 * Format page range string
 */
function formatPageRange(start: number | null, end: number | null): string {
    if (start === null && end === null) return 'N/A';
    if (start === end || end === null) return `p. ${start}`;
    return `pp. ${start}-${end}`;
}

/**
 * Format citation string for agent response
 */
export function formatCitationString(citation: Citation): string {
    return `[${citation.documentName}, ${citation.pages}]`;
}

/**
 * Build grounded response prompt
 */
export function buildGroundedPrompt(
    query: string,
    chunks: RetrievedChunk[]
): string {
    const context = chunks
        .map((chunk, i) => {
            const pages = formatPageRange(chunk.pageStart, chunk.pageEnd);
            return `[Source ${i + 1}: ${chunk.documentName}, ${pages}]\n${chunk.content}\n`;
        })
        .join('\n---\n');

    return `You are an accounting and tax expert. Answer the following question using ONLY the provided sources.

RULES:
1. Cite sources for every claim using [Source N] format
2. If the sources don't contain enough information, say so
3. Never invent tax rates, IFRS rules, or legal requirements
4. Be precise about jurisdictions and effective dates

SOURCES:
${context}

QUESTION: ${query}

ANSWER (with citations):`;
}
