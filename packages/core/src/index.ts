/**
 * @prisma/core - Core Infrastructure Package
 * 
 * Enterprise-grade infrastructure services for the Prisma AI platform.
 */

// Infrastructure services - lazy exports to avoid conflicts
// export * from './infrastructure/event-bus.js';
// export * from './infrastructure/cache-service.js';
// export * from './infrastructure/search-service.js';
// export * from './infrastructure/auto-scaling.js';

// Compliance services
// export * from './compliance/soc2-compliance.js';
// export * from './compliance/gdpr-ccpa-compliance.js';
// export * from './compliance/audit-logging.js';

// Monitoring services
// export * from './monitoring/sla-monitoring.js';

// RAG types (used by audit agents)
export interface RAGContext {
    chunks: RAGChunk[];
    sources: string[];
    confidence: number;
}

export interface RAGChunk {
    content: string;
    source: string;
    score: number;
    metadata?: Record<string, unknown>;
}

export abstract class RAGEnhancedAgent {
    abstract getRAGContext(query: string, options?: RAGOptions): Promise<RAGContext>;
    abstract buildRAGSystemPrompt(basePrompt: string, context: RAGContext): string;
    abstract getRAGStats(context: RAGContext): RAGStats;
}

export interface RAGOptions {
    maxChunks?: number;
    minScore?: number;
    sources?: string[];
}

export interface RAGStats {
    totalChunks: number;
    avgScore: number;
    sourcesUsed: string[];
}
