/**
 * Hybrid Search Engine
 * 
 * Combines vector similarity search with BM25 keyword search for
 * improved retrieval quality. Supports multi-index strategy and
 * optional reranking.
 * 
 * @example
 * ```typescript
 * const engine = new HybridSearchEngine(config);
 * const results = await engine.search('ISA 315 risk assessment', {
 *     indexes: ['standards', 'internal'],
 *     topK: 10,
 *     rerank: true,
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SearchResult {
    id: string;
    content: string;
    score: number;
    vectorScore?: number;
    keywordScore?: number;
    rerankScore?: number;
    metadata: SearchMetadata;
    highlights?: string[];
}

export interface SearchMetadata {
    source: string;
    sourceType: 'standard' | 'tax_code' | 'internal' | 'workpaper' | 'guidance' | 'other';
    title?: string;
    section?: string;
    paragraph?: string;
    url?: string;
    lastUpdated?: Date;
    jurisdiction?: string;
    tags?: string[];
}

export interface SearchOptions {
    indexes?: IndexType[];
    topK?: number;
    filter?: SearchFilter;
    rerank?: boolean;
    rerankModel?: string;
    hybridAlpha?: number;  // 0 = keyword only, 1 = vector only
    includeHighlights?: boolean;
    minScore?: number;
}

export interface SearchFilter {
    sourceTypes?: SearchMetadata['sourceType'][];
    jurisdiction?: string[];
    tags?: string[];
    dateRange?: { start?: Date; end?: Date };
}

export type IndexType =
    | 'standards'      // ISA, GAAP, IFRS
    | 'tax_codes'      // Tax regulations
    | 'internal'       // Firm policies, templates
    | 'workpapers'     // Client workpapers
    | 'guidance'       // PCAOB, SEC, etc.
    | 'all';

// ============================================================================
// BM25 IMPLEMENTATION
// ============================================================================

interface BM25Config {
    k1: number;  // Term frequency saturation (1.2-2.0)
    b: number;   // Document length normalization (0.75)
}

class BM25Index {
    private documents: Map<string, { content: string; tokens: string[]; metadata: SearchMetadata }> = new Map();
    private termFrequencies: Map<string, Map<string, number>> = new Map();  // term -> docId -> freq
    private documentFrequencies: Map<string, number> = new Map();  // term -> num docs containing term
    private avgDocLength: number = 0;
    private config: BM25Config;

    constructor(config: Partial<BM25Config> = {}) {
        this.config = {
            k1: config.k1 ?? 1.5,
            b: config.b ?? 0.75,
        };
    }

    /**
     * Add document to index
     */
    addDocument(id: string, content: string, metadata: SearchMetadata): void {
        const tokens = this.tokenize(content);
        this.documents.set(id, { content, tokens, metadata });

        // Update term frequencies
        const termFreq = new Map<string, number>();
        for (const token of tokens) {
            termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
        }

        for (const [term, freq] of termFreq) {
            if (!this.termFrequencies.has(term)) {
                this.termFrequencies.set(term, new Map());
            }
            this.termFrequencies.get(term)!.set(id, freq);

            // Update document frequency
            this.documentFrequencies.set(term, (this.documentFrequencies.get(term) ?? 0) + 1);
        }

        // Update average document length
        this.updateAvgDocLength();
    }

    /**
     * Search using BM25 algorithm
     */
    search(query: string, topK: number = 10): Array<{ id: string; score: number; content: string; metadata: SearchMetadata }> {
        const queryTokens = this.tokenize(query);
        const scores = new Map<string, number>();
        const N = this.documents.size;

        for (const term of queryTokens) {
            const docFreqs = this.termFrequencies.get(term);
            if (!docFreqs) continue;

            const df = this.documentFrequencies.get(term) ?? 0;
            const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

            for (const [docId, tf] of docFreqs) {
                const doc = this.documents.get(docId)!;
                const docLength = doc.tokens.length;
                const numerator = tf * (this.config.k1 + 1);
                const denominator = tf + this.config.k1 * (1 - this.config.b + this.config.b * (docLength / this.avgDocLength));
                const score = idf * (numerator / denominator);

                scores.set(docId, (scores.get(docId) ?? 0) + score);
            }
        }

        // Sort and return top K
        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topK)
            .map(([id, score]) => {
                const doc = this.documents.get(id)!;
                return { id, score, content: doc.content, metadata: doc.metadata };
            });
    }

    /**
     * Tokenize text for indexing/search
     */
    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2);
    }

    private updateAvgDocLength(): void {
        let totalLength = 0;
        for (const doc of this.documents.values()) {
            totalLength += doc.tokens.length;
        }
        this.avgDocLength = this.documents.size > 0 ? totalLength / this.documents.size : 0;
    }

    get size(): number {
        return this.documents.size;
    }
}

// ============================================================================
// HYBRID SEARCH ENGINE
// ============================================================================

export interface HybridSearchConfig {
    openaiApiKey?: string;
    cohereApiKey?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    embeddingModel?: string;
    rerankModel?: string;
    defaultHybridAlpha?: number;
}

export class HybridSearchEngine {
    private config: HybridSearchConfig;
    private bm25Indexes: Map<IndexType, BM25Index> = new Map();
    private vectorEnabled: boolean = false;

    constructor(config: HybridSearchConfig = {}) {
        this.config = {
            embeddingModel: config.embeddingModel ?? 'text-embedding-3-small',
            rerankModel: config.rerankModel ?? 'rerank-english-v3.0',
            defaultHybridAlpha: config.defaultHybridAlpha ?? 0.7,  // 70% vector, 30% keyword
            ...config,
        };

        // Initialize BM25 indexes for each type
        for (const indexType of ['standards', 'tax_codes', 'internal', 'workpapers', 'guidance'] as IndexType[]) {
            this.bm25Indexes.set(indexType, new BM25Index());
        }

        this.vectorEnabled = !!(config.openaiApiKey && config.supabaseUrl);
    }

    /**
     * Index a document
     */
    async indexDocument(
        id: string,
        content: string,
        metadata: SearchMetadata,
        indexType: IndexType = 'internal'
    ): Promise<void> {
        // Add to BM25 index
        const bm25Index = this.bm25Indexes.get(indexType);
        if (bm25Index) {
            bm25Index.addDocument(id, content, metadata);
        }

        // In production, would also add to vector store (Supabase/pgvector)
        if (this.vectorEnabled) {
            await this.indexVector(id, content, metadata, indexType);
        }
    }

    /**
     * Perform hybrid search
     */
    async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        const {
            indexes = ['all'],
            topK = 10,
            filter,
            rerank = true,
            hybridAlpha = this.config.defaultHybridAlpha ?? 0.7,
            includeHighlights = true,
            minScore = 0,
        } = options;

        // Determine which indexes to search
        const targetIndexes = indexes.includes('all')
            ? (['standards', 'tax_codes', 'internal', 'workpapers', 'guidance'] as IndexType[])
            : indexes;

        // Get keyword results from BM25
        const keywordResults = this.searchBM25(query, targetIndexes, topK * 2);

        // Get vector results if enabled
        let vectorResults: SearchResult[] = [];
        if (this.vectorEnabled) {
            vectorResults = await this.searchVector(query, targetIndexes, topK * 2);
        }

        // Combine results using reciprocal rank fusion
        const combined = this.fuseResults(keywordResults, vectorResults, hybridAlpha, topK * 2);

        // Apply filters
        let filtered = this.applyFilters(combined, filter);

        // Rerank if enabled and Cohere key available
        if (rerank && this.config.cohereApiKey && filtered.length > 1) {
            filtered = await this.rerankWithCohere(query, filtered, topK);
        } else {
            filtered = filtered.slice(0, topK);
        }

        // Add highlights
        if (includeHighlights) {
            filtered = this.addHighlights(query, filtered);
        }

        // Apply min score filter
        if (minScore > 0) {
            filtered = filtered.filter(r => r.score >= minScore);
        }

        return filtered;
    }

    /**
     * Search by specific standard/code reference
     */
    async searchByReference(
        reference: string,  // e.g., "ISA 315.12", "IRC 482"
        options: Omit<SearchOptions, 'indexes'> = {}
    ): Promise<SearchResult[]> {
        // Parse reference to determine index
        let indexType: IndexType = 'standards';
        if (reference.match(/^(IRC|Reg|Treas)/i)) {
            indexType = 'tax_codes';
        } else if (reference.match(/^(PCAOB|SEC|FASB)/i)) {
            indexType = 'guidance';
        }

        return this.search(reference, { ...options, indexes: [indexType] });
    }

    /**
     * Get index statistics
     */
    getIndexStats(): Record<IndexType, { documentCount: number }> {
        const stats: Record<string, { documentCount: number }> = {};

        for (const [indexType, index] of this.bm25Indexes) {
            stats[indexType] = { documentCount: index.size };
        }

        return stats as Record<IndexType, { documentCount: number }>;
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private searchBM25(query: string, indexes: IndexType[], topK: number): SearchResult[] {
        const results: SearchResult[] = [];

        for (const indexType of indexes) {
            const index = this.bm25Indexes.get(indexType);
            if (!index) continue;

            const indexResults = index.search(query, topK);
            for (const r of indexResults) {
                results.push({
                    id: r.id,
                    content: r.content,
                    score: r.score,
                    keywordScore: r.score,
                    metadata: r.metadata,
                });
            }
        }

        return results;
    }

    private async searchVector(
        query: string,
        indexes: IndexType[],
        topK: number
    ): Promise<SearchResult[]> {
        // In production, this would:
        // 1. Generate embedding for query using OpenAI
        // 2. Search pgvector in Supabase
        // For now, return empty (BM25 will be primary)
        return [];
    }

    private async indexVector(
        id: string,
        content: string,
        metadata: SearchMetadata,
        indexType: IndexType
    ): Promise<void> {
        // In production, this would:
        // 1. Generate embedding using OpenAI
        // 2. Store in pgvector via Supabase
    }

    private fuseResults(
        keywordResults: SearchResult[],
        vectorResults: SearchResult[],
        alpha: number,
        topK: number
    ): SearchResult[] {
        const fusedScores = new Map<string, { result: SearchResult; keywordRank: number; vectorRank: number }>();
        const k = 60;  // RRF constant

        // Add keyword results
        for (let i = 0; i < keywordResults.length; i++) {
            const result = keywordResults[i];
            fusedScores.set(result.id, {
                result,
                keywordRank: i + 1,
                vectorRank: Infinity,
            });
        }

        // Add/update vector results
        for (let i = 0; i < vectorResults.length; i++) {
            const result = vectorResults[i];
            if (fusedScores.has(result.id)) {
                fusedScores.get(result.id)!.vectorRank = i + 1;
                fusedScores.get(result.id)!.result.vectorScore = result.score;
            } else {
                fusedScores.set(result.id, {
                    result: { ...result, vectorScore: result.score },
                    keywordRank: Infinity,
                    vectorRank: i + 1,
                });
            }
        }

        // Calculate RRF scores
        const results: SearchResult[] = [];
        for (const { result, keywordRank, vectorRank } of fusedScores.values()) {
            const keywordRRF = 1 / (k + keywordRank);
            const vectorRRF = 1 / (k + vectorRank);

            // Weighted combination
            result.score = (1 - alpha) * keywordRRF + alpha * vectorRRF;
            results.push(result);
        }

        return results.sort((a, b) => b.score - a.score).slice(0, topK);
    }

    private applyFilters(results: SearchResult[], filter?: SearchFilter): SearchResult[] {
        if (!filter) return results;

        return results.filter(r => {
            if (filter.sourceTypes && !filter.sourceTypes.includes(r.metadata.sourceType)) {
                return false;
            }
            if (filter.jurisdiction && r.metadata.jurisdiction &&
                !filter.jurisdiction.includes(r.metadata.jurisdiction)) {
                return false;
            }
            if (filter.tags && r.metadata.tags) {
                const hasTag = filter.tags.some(t => r.metadata.tags!.includes(t));
                if (!hasTag) return false;
            }
            if (filter.dateRange && r.metadata.lastUpdated) {
                if (filter.dateRange.start && r.metadata.lastUpdated < filter.dateRange.start) return false;
                if (filter.dateRange.end && r.metadata.lastUpdated > filter.dateRange.end) return false;
            }
            return true;
        });
    }

    private async rerankWithCohere(
        query: string,
        results: SearchResult[],
        topK: number
    ): Promise<SearchResult[]> {
        // In production, this would call Cohere's rerank API
        // For now, return as-is with simulated rerank scores
        return results.slice(0, topK).map((r, i) => ({
            ...r,
            rerankScore: 1 - (i * 0.05),
            score: 1 - (i * 0.05),  // Update main score to rerank score
        }));
    }

    private addHighlights(query: string, results: SearchResult[]): SearchResult[] {
        const queryTerms = query.toLowerCase().split(/\s+/);

        return results.map(r => {
            const highlights: string[] = [];
            const sentences = r.content.split(/[.!?]+/);

            for (const sentence of sentences) {
                const lowerSentence = sentence.toLowerCase();
                if (queryTerms.some(term => lowerSentence.includes(term))) {
                    highlights.push(sentence.trim());
                    if (highlights.length >= 3) break;
                }
            }

            return { ...r, highlights };
        });
    }
}

// Export singleton with default config
export const hybridSearch = new HybridSearchEngine();
