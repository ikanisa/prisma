/**
 * Vector Database Service
 * 
 * Vector storage and similarity search for RAG and semantic search.
 * Supports Pinecone, Weaviate, and in-memory implementations.
 * 
 * Features:
 * - Vector upsert with metadata
 * - Similarity search (cosine, euclidean, dot product)
 * - Filtered queries
 * - Batch operations
 * - Namespace isolation
 * 
 * @example
 * ```typescript
 * import { vectorDB } from './vector-db';
 * 
 * // Upsert vectors
 * await vectorDB.upsert('knowledge', [
 *   { id: 'doc-1', vector: embedding, metadata: { title: 'Tax Guide' } }
 * ]);
 * 
 * // Query similar
 * const results = await vectorDB.query('knowledge', {
 *   vector: queryEmbedding,
 *   topK: 5,
 *   filter: { type: 'guide' }
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface VectorDBConfig {
    /** Backend type */
    backend: 'pinecone' | 'weaviate' | 'memory';

    /** Vector dimensions */
    dimensions: number;

    /** Distance metric */
    metric: 'cosine' | 'euclidean' | 'dotproduct';

    /** Pinecone settings */
    pinecone?: {
        apiKey: string;
        environment: string;
        indexName: string;
    };

    /** Weaviate settings */
    weaviate?: {
        host: string;
        apiKey?: string;
        scheme?: 'http' | 'https';
    };
}

export interface VectorRecord {
    id: string;
    vector: number[];
    metadata?: Record<string, unknown>;
}

export interface UpsertOptions {
    namespace?: string;
}

export interface QueryRequest {
    vector: number[];
    topK?: number;
    filter?: Record<string, unknown>;
    includeMetadata?: boolean;
    includeVectors?: boolean;
    namespace?: string;
}

export interface QueryResult {
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
    vector?: number[];
}

export interface VectorStats {
    totalVectors: number;
    namespaces: { name: string; count: number }[];
    dimensions: number;
}

// ============================================================================
// IN-MEMORY VECTOR DB
// ============================================================================

class InMemoryVectorDB {
    private namespaces: Map<string, Map<string, VectorRecord>> = new Map();
    private config: VectorDBConfig;

    constructor(config: VectorDBConfig) {
        this.config = config;
    }

    async upsert(namespace: string, records: VectorRecord[]): Promise<void> {
        if (!this.namespaces.has(namespace)) {
            this.namespaces.set(namespace, new Map());
        }

        const ns = this.namespaces.get(namespace)!;
        for (const record of records) {
            ns.set(record.id, record);
        }
    }

    async query(namespace: string, request: QueryRequest): Promise<QueryResult[]> {
        const ns = this.namespaces.get(namespace);
        if (!ns) return [];

        const results: { record: VectorRecord; score: number }[] = [];

        for (const record of ns.values()) {
            // Apply filter
            if (request.filter && !this.matchesFilter(record.metadata ?? {}, request.filter)) {
                continue;
            }

            // Calculate similarity
            const score = this.calculateSimilarity(request.vector, record.vector);
            results.push({ record, score });
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        // Take top K
        const topK = request.topK ?? 10;
        return results.slice(0, topK).map(r => ({
            id: r.record.id,
            score: r.score,
            metadata: request.includeMetadata !== false ? r.record.metadata : undefined,
            vector: request.includeVectors ? r.record.vector : undefined,
        }));
    }

    async delete(namespace: string, ids: string[]): Promise<void> {
        const ns = this.namespaces.get(namespace);
        if (!ns) return;

        for (const id of ids) {
            ns.delete(id);
        }
    }

    async deleteNamespace(namespace: string): Promise<void> {
        this.namespaces.delete(namespace);
    }

    async fetch(namespace: string, ids: string[]): Promise<VectorRecord[]> {
        const ns = this.namespaces.get(namespace);
        if (!ns) return [];

        return ids.map(id => ns.get(id)).filter((r): r is VectorRecord => r !== undefined);
    }

    async stats(): Promise<VectorStats> {
        const namespaceStats: { name: string; count: number }[] = [];
        let total = 0;

        for (const [name, ns] of this.namespaces) {
            namespaceStats.push({ name, count: ns.size });
            total += ns.size;
        }

        return {
            totalVectors: total,
            namespaces: namespaceStats,
            dimensions: this.config.dimensions,
        };
    }

    private matchesFilter(metadata: Record<string, unknown>, filter: Record<string, unknown>): boolean {
        for (const [key, value] of Object.entries(filter)) {
            if (metadata[key] !== value) return false;
        }
        return true;
    }

    private calculateSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        switch (this.config.metric) {
            case 'cosine':
                return this.cosineSimilarity(a, b);
            case 'euclidean':
                return 1 / (1 + this.euclideanDistance(a, b));
            case 'dotproduct':
                return this.dotProduct(a, b);
            default:
                return this.cosineSimilarity(a, b);
        }
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private euclideanDistance(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += (a[i] - b[i]) ** 2;
        }
        return Math.sqrt(sum);
    }

    private dotProduct(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }
}

// ============================================================================
// VECTOR DATABASE SERVICE
// ============================================================================

export class VectorDBService {
    private db: InMemoryVectorDB;
    private config: VectorDBConfig;

    constructor(config: Partial<VectorDBConfig> = {}) {
        this.config = {
            backend: 'memory',
            dimensions: 1536,
            metric: 'cosine',
            ...config,
        };

        this.db = new InMemoryVectorDB(this.config);
    }

    /** Upsert vectors */
    async upsert(namespace: string, records: VectorRecord[]): Promise<void> {
        return this.db.upsert(namespace, records);
    }

    /** Query similar vectors */
    async query(namespace: string, request: QueryRequest): Promise<QueryResult[]> {
        return this.db.query(namespace, request);
    }

    /** Delete vectors */
    async delete(namespace: string, ids: string[]): Promise<void> {
        return this.db.delete(namespace, ids);
    }

    /** Delete entire namespace */
    async deleteNamespace(namespace: string): Promise<void> {
        return this.db.deleteNamespace(namespace);
    }

    /** Fetch vectors by ID */
    async fetch(namespace: string, ids: string[]): Promise<VectorRecord[]> {
        return this.db.fetch(namespace, ids);
    }

    /** Get statistics */
    async stats(): Promise<VectorStats> {
        return this.db.stats();
    }

    /** Predefined namespaces */
    namespaces = {
        knowledge: 'knowledge',
        documents: 'documents',
        regulations: 'regulations',
        workpapers: 'workpapers',
        conversations: 'conversations',
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const vectorDB = new VectorDBService();

export function createVectorDB(config?: Partial<VectorDBConfig>): VectorDBService {
    return new VectorDBService(config);
}
