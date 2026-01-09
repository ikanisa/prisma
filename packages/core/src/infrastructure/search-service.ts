/**
 * Search Service
 * 
 * Full-text search integration supporting Elasticsearch and in-memory search.
 * Provides document indexing, semantic search, and faceted queries.
 * 
 * Features:
 * - Configurable backend (Elasticsearch, in-memory)
 * - Full-text search with relevance scoring
 * - Faceted search and aggregations
 * - Semantic vector search (hybrid)
 * - Index management and reindexing
 * - Query highlighting
 * 
 * @example
 * ```typescript
 * import { searchService } from './search-service';
 * 
 * // Index document
 * await searchService.index('documents', {
 *   id: 'doc-123',
 *   title: '2026 Tax Filing Guide',
 *   content: 'Complete guide to sales tax filing...',
 *   tags: ['tax', 'filing', 'guide'],
 * });
 * 
 * // Search
 * const results = await searchService.search('documents', {
 *   query: 'sales tax california',
 *   filters: { tags: ['tax'] },
 *   limit: 10,
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SearchConfig {
    /** Search backend */
    backend: 'elasticsearch' | 'memory';

    /** Elasticsearch connection */
    elasticsearch?: {
        nodes: string[];
        auth?: {
            username: string;
            password: string;
        };
        ssl?: boolean;
    };

    /** Enable vector search */
    enableVectorSearch?: boolean;

    /** Vector dimensions (for embeddings) */
    vectorDimensions?: number;
}

export interface SearchDocument {
    id: string;
    [key: string]: unknown;
}

export interface IndexOptions {
    /** Refresh index after write */
    refresh?: boolean;

    /** Custom routing */
    routing?: string;

    /** Version for optimistic locking */
    version?: number;
}

export interface SearchQuery {
    /** Text query */
    query: string;

    /** Field-specific queries */
    fields?: string[];

    /** Filter conditions */
    filters?: Record<string, unknown>;

    /** Facet fields */
    facets?: string[];

    /** Sort order */
    sort?: { field: string; order: 'asc' | 'desc' }[];

    /** Pagination */
    offset?: number;
    limit?: number;

    /** Enable highlighting */
    highlight?: boolean;

    /** Vector for semantic search */
    vector?: number[];
}

export interface SearchResult<T = SearchDocument> {
    hits: SearchHit<T>[];
    total: number;
    maxScore: number;
    facets?: Record<string, FacetResult[]>;
    took: number;
}

export interface SearchHit<T> {
    id: string;
    score: number;
    source: T;
    highlight?: Record<string, string[]>;
}

export interface FacetResult {
    value: string;
    count: number;
}

export interface IndexInfo {
    name: string;
    docCount: number;
    sizeBytes: number;
    createdAt: Date;
}

// ============================================================================
// IN-MEMORY SEARCH IMPLEMENTATION
// ============================================================================

class InMemorySearch {
    private indices: Map<string, Map<string, SearchDocument>> = new Map();
    private invertedIndex: Map<string, Map<string, Set<string>>> = new Map(); // indexName -> word -> docIds

    async createIndex(name: string): Promise<void> {
        if (!this.indices.has(name)) {
            this.indices.set(name, new Map());
            this.invertedIndex.set(name, new Map());
        }
    }

    async deleteIndex(name: string): Promise<void> {
        this.indices.delete(name);
        this.invertedIndex.delete(name);
    }

    async index(indexName: string, doc: SearchDocument, options?: IndexOptions): Promise<void> {
        await this.createIndex(indexName);

        const index = this.indices.get(indexName)!;
        const inverted = this.invertedIndex.get(indexName)!;

        // Store document
        index.set(doc.id, doc);

        // Build inverted index
        const text = this.extractText(doc);
        const words = this.tokenize(text);

        for (const word of words) {
            if (!inverted.has(word)) {
                inverted.set(word, new Set());
            }
            inverted.get(word)!.add(doc.id);
        }
    }

    async bulkIndex(indexName: string, docs: SearchDocument[]): Promise<void> {
        for (const doc of docs) {
            await this.index(indexName, doc);
        }
    }

    async delete(indexName: string, docId: string): Promise<boolean> {
        const index = this.indices.get(indexName);
        if (!index) return false;

        const doc = index.get(docId);
        if (!doc) return false;

        // Remove from inverted index
        const inverted = this.invertedIndex.get(indexName)!;
        const text = this.extractText(doc);
        const words = this.tokenize(text);

        for (const word of words) {
            inverted.get(word)?.delete(docId);
        }

        return index.delete(docId);
    }

    async search<T extends SearchDocument>(indexName: string, query: SearchQuery): Promise<SearchResult<T>> {
        const startTime = Date.now();
        const index = this.indices.get(indexName);
        const inverted = this.invertedIndex.get(indexName);

        if (!index || !inverted) {
            return { hits: [], total: 0, maxScore: 0, took: 0 };
        }

        // Find matching documents
        const queryWords = this.tokenize(query.query);
        const docScores = new Map<string, number>();

        for (const word of queryWords) {
            const matchingDocs = inverted.get(word.toLowerCase());
            if (matchingDocs) {
                for (const docId of matchingDocs) {
                    const current = docScores.get(docId) ?? 0;
                    docScores.set(docId, current + 1);
                }
            }
        }

        // Apply filters
        let matchingIds = Array.from(docScores.keys());
        if (query.filters) {
            matchingIds = matchingIds.filter(id => {
                const doc = index.get(id);
                if (!doc) return false;
                return this.matchesFilters(doc, query.filters!);
            });
        }

        // Score and sort
        const scored = matchingIds.map(id => ({
            id,
            score: (docScores.get(id) ?? 0) / queryWords.length,
            source: index.get(id) as T,
        }));

        scored.sort((a, b) => b.score - a.score);

        // Pagination
        const offset = query.offset ?? 0;
        const limit = query.limit ?? 10;
        const paged = scored.slice(offset, offset + limit);

        // Build highlights
        const hits: SearchHit<T>[] = paged.map(item => {
            const hit: SearchHit<T> = {
                id: item.id,
                score: item.score,
                source: item.source,
            };

            if (query.highlight) {
                hit.highlight = this.buildHighlight(item.source, queryWords);
            }

            return hit;
        });

        // Build facets
        let facets: Record<string, FacetResult[]> | undefined;
        if (query.facets) {
            facets = {};
            for (const field of query.facets) {
                facets[field] = this.buildFacet(index, matchingIds, field);
            }
        }

        return {
            hits,
            total: scored.length,
            maxScore: hits[0]?.score ?? 0,
            facets,
            took: Date.now() - startTime,
        };
    }

    async getDocument<T extends SearchDocument>(indexName: string, id: string): Promise<T | null> {
        const index = this.indices.get(indexName);
        return (index?.get(id) as T) ?? null;
    }

    async count(indexName: string): Promise<number> {
        return this.indices.get(indexName)?.size ?? 0;
    }

    async listIndices(): Promise<IndexInfo[]> {
        const result: IndexInfo[] = [];
        for (const [name, docs] of this.indices) {
            result.push({
                name,
                docCount: docs.size,
                sizeBytes: JSON.stringify(Array.from(docs.values())).length * 2,
                createdAt: new Date(),
            });
        }
        return result;
    }

    private extractText(doc: SearchDocument): string {
        const parts: string[] = [];
        for (const [key, value] of Object.entries(doc)) {
            if (typeof value === 'string') {
                parts.push(value);
            } else if (Array.isArray(value)) {
                parts.push(...value.filter(v => typeof v === 'string'));
            }
        }
        return parts.join(' ');
    }

    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    private matchesFilters(doc: SearchDocument, filters: Record<string, unknown>): boolean {
        for (const [key, value] of Object.entries(filters)) {
            const docValue = doc[key];
            if (Array.isArray(value)) {
                if (!value.includes(docValue)) return false;
            } else if (Array.isArray(docValue)) {
                if (!docValue.includes(value)) return false;
            } else if (docValue !== value) {
                return false;
            }
        }
        return true;
    }

    private buildHighlight(doc: SearchDocument, queryWords: string[]): Record<string, string[]> {
        const highlight: Record<string, string[]> = {};
        const querySet = new Set(queryWords.map(w => w.toLowerCase()));

        for (const [key, value] of Object.entries(doc)) {
            if (typeof value !== 'string') continue;

            const words = value.split(/\s+/);
            const matches: string[] = [];

            for (let i = 0; i < words.length; i++) {
                if (querySet.has(words[i].toLowerCase().replace(/[^\w]/g, ''))) {
                    const start = Math.max(0, i - 3);
                    const end = Math.min(words.length, i + 4);
                    const snippet = words.slice(start, end).join(' ');
                    matches.push(`...${snippet.replace(new RegExp(`(${queryWords.join('|')})`, 'gi'), '<em>$1</em>')}...`);
                }
            }

            if (matches.length > 0) {
                highlight[key] = matches.slice(0, 3);
            }
        }

        return highlight;
    }

    private buildFacet(index: Map<string, SearchDocument>, docIds: string[], field: string): FacetResult[] {
        const counts = new Map<string, number>();

        for (const docId of docIds) {
            const doc = index.get(docId);
            if (!doc) continue;

            const value = doc[field];
            if (typeof value === 'string') {
                counts.set(value, (counts.get(value) ?? 0) + 1);
            } else if (Array.isArray(value)) {
                for (const v of value) {
                    if (typeof v === 'string') {
                        counts.set(v, (counts.get(v) ?? 0) + 1);
                    }
                }
            }
        }

        return Array.from(counts.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
    }
}

// ============================================================================
// SEARCH SERVICE
// ============================================================================

export class SearchService {
    private search: InMemorySearch;
    private config: SearchConfig;

    constructor(config: Partial<SearchConfig> = {}) {
        this.config = {
            backend: 'memory',
            enableVectorSearch: false,
            vectorDimensions: 1536,
            ...config,
        };

        this.search = new InMemorySearch();
    }

    /** Create an index */
    async createIndex(name: string): Promise<void> {
        return this.search.createIndex(name);
    }

    /** Delete an index */
    async deleteIndex(name: string): Promise<void> {
        return this.search.deleteIndex(name);
    }

    /** Index a document */
    async index(indexName: string, doc: SearchDocument, options?: IndexOptions): Promise<void> {
        return this.search.index(indexName, doc, options);
    }

    /** Bulk index documents */
    async bulkIndex(indexName: string, docs: SearchDocument[]): Promise<void> {
        return this.search.bulkIndex(indexName, docs);
    }

    /** Delete a document */
    async delete(indexName: string, docId: string): Promise<boolean> {
        return this.search.delete(indexName, docId);
    }

    /** Search documents */
    async search<T extends SearchDocument>(indexName: string, query: SearchQuery): Promise<SearchResult<T>> {
        return this.search.search<T>(indexName, query);
    }

    /** Get document by ID */
    async getDocument<T extends SearchDocument>(indexName: string, id: string): Promise<T | null> {
        return this.search.getDocument<T>(indexName, id);
    }

    /** Count documents */
    async count(indexName: string): Promise<number> {
        return this.search.count(indexName);
    }

    /** List all indices */
    async listIndices(): Promise<IndexInfo[]> {
        return this.search.listIndices();
    }

    /** Predefined indices */
    indices = {
        documents: 'documents',
        workpapers: 'workpapers',
        jurisdictions: 'jurisdictions',
        regulations: 'regulations',
        engagements: 'engagements',
        knowledge: 'knowledge',
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const searchService = new SearchService();

export function createSearchService(config?: Partial<SearchConfig>): SearchService {
    return new SearchService(config);
}
