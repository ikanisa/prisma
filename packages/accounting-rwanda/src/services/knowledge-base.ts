/**
 * Rwanda Knowledge Base Service
 * 
 * RAG (Retrieval-Augmented Generation) system for Rwanda regulatory knowledge.
 * Uses OpenAI embeddings and pgvector for semantic search.
 * 
 * Documents included:
 * - IFRS Standards
 * - ISA Standards
 * - RRA Tax Code (Law 016/2018)
 * - ICPAR Circulars
 * - BNR Directives
 * - EAC/AfCFTA Regulations
 * 
 * @package @prisma/accounting-rwanda
 */

import OpenAI from 'openai';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Document source types.
 */
export type DocumentSourceType =
    | 'IFRS_STANDARD'
    | 'ISA_STANDARD'
    | 'RRA_TAX_CODE'
    | 'ICPAR_CIRCULAR'
    | 'BNR_DIRECTIVE'
    | 'EAC_REGULATION'
    | 'AFCFTA_RULE'
    | 'INTERNAL_POLICY';

/**
 * Document input for ingestion.
 */
export interface DocumentInput {
    sourceType: DocumentSourceType;
    title: string;
    version?: string;
    effectiveDate?: Date;
    fullText: string;
    metadata?: Record<string, unknown>;
}

/**
 * Chunk with embedding.
 */
export interface ChunkWithEmbedding {
    chunkIndex: number;
    chunkText: string;
    embedding: number[];
    tokenCount: number;
}

/**
 * Search result.
 */
export interface SearchResult {
    documentId: string;
    documentTitle: string;
    sourceType: DocumentSourceType;
    chunkText: string;
    similarity: number;
    metadata?: Record<string, unknown>;
}

/**
 * Knowledge base configuration.
 */
export interface KnowledgeBaseConfig {
    openaiApiKey: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    embeddingModel?: string;
    chunkSize?: number;
    chunkOverlap?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const EMBEDDING_DIMENSIONS = 1536;

// ============================================================================
// RWANDA KNOWLEDGE BASE SERVICE
// ============================================================================

/**
 * Rwanda Knowledge Base Service.
 * 
 * Handles document ingestion, embedding generation, and semantic search
 * for Rwanda regulatory documents.
 */
export class RwandaKnowledgeBase {
    private openai: OpenAI | null = null;
    private config: Required<KnowledgeBaseConfig>;

    constructor(config: KnowledgeBaseConfig) {
        this.config = {
            embeddingModel: DEFAULT_EMBEDDING_MODEL,
            chunkSize: DEFAULT_CHUNK_SIZE,
            chunkOverlap: DEFAULT_CHUNK_OVERLAP,
            supabaseUrl: '',
            supabaseKey: '',
            ...config,
        };

        // Initialize OpenAI client
        if (config.openaiApiKey) {
            try {
                this.openai = new OpenAI({ apiKey: config.openaiApiKey });
            } catch {
                // Will be initialized when needed
            }
        }
    }

    // =========================================================================
    // DOCUMENT INGESTION
    // =========================================================================

    /**
     * Ingest a document into the knowledge base.
     */
    async ingestDocument(document: DocumentInput): Promise<{
        documentId: string;
        chunksCreated: number;
        totalTokens: number;
    }> {
        // Step 1: Chunk the document
        const chunks = this.chunkText(document.fullText);

        // Step 2: Generate embeddings for each chunk
        const chunksWithEmbeddings = await this.generateEmbeddings(chunks);

        // Step 3: Store in database (returns mock ID if no Supabase)
        const documentId = `doc-${Date.now()}`;
        const totalTokens = chunksWithEmbeddings.reduce((sum, c) => sum + c.tokenCount, 0);

        // In production, store to Supabase:
        // await this.storeDocument(document, documentId);
        // await this.storeChunks(documentId, chunksWithEmbeddings);

        return {
            documentId,
            chunksCreated: chunksWithEmbeddings.length,
            totalTokens,
        };
    }

    /**
     * Ingest multiple documents.
     */
    async ingestDocuments(documents: DocumentInput[]): Promise<{
        processed: number;
        failed: number;
        results: Array<{ title: string; documentId?: string; error?: string }>;
    }> {
        const results: Array<{ title: string; documentId?: string; error?: string }> = [];
        let processed = 0;
        let failed = 0;

        for (const doc of documents) {
            try {
                const result = await this.ingestDocument(doc);
                results.push({ title: doc.title, documentId: result.documentId });
                processed++;
            } catch (error) {
                results.push({
                    title: doc.title,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                failed++;
            }
        }

        return { processed, failed, results };
    }

    /**
     * Chunk text into smaller pieces for embedding.
     */
    chunkText(text: string): string[] {
        const chunks: string[] = [];
        const sentences = text.split(/(?<=[.!?])\s+/);
        let currentChunk = '';

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= this.config.chunkSize) {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }
                currentChunk = sentence;
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk);
        }

        // Apply overlap by including end of previous chunk
        const overlappedChunks: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
            if (i === 0) {
                overlappedChunks.push(chunks[i]);
            } else {
                const prevChunk = chunks[i - 1];
                const overlap = prevChunk.slice(-this.config.chunkOverlap);
                overlappedChunks.push(overlap + ' ' + chunks[i]);
            }
        }

        return overlappedChunks;
    }

    /**
     * Generate embeddings for chunks.
     */
    async generateEmbeddings(chunks: string[]): Promise<ChunkWithEmbedding[]> {
        if (!this.openai) {
            // Return mock embeddings for testing
            return chunks.map((text, index) => ({
                chunkIndex: index,
                chunkText: text,
                embedding: new Array(EMBEDDING_DIMENSIONS).fill(0).map(() => Math.random()),
                tokenCount: Math.ceil(text.length / 4),
            }));
        }

        const results: ChunkWithEmbedding[] = [];

        // Process in batches of 100 (OpenAI limit)
        const batchSize = 100;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);

            const response = await this.openai.embeddings.create({
                model: this.config.embeddingModel,
                input: batch,
            });

            for (let j = 0; j < response.data.length; j++) {
                results.push({
                    chunkIndex: i + j,
                    chunkText: batch[j],
                    embedding: response.data[j].embedding,
                    tokenCount: response.usage.total_tokens / batch.length,
                });
            }
        }

        return results;
    }

    // =========================================================================
    // SEARCH
    // =========================================================================

    /**
     * Search the knowledge base using semantic similarity.
     */
    async search(
        query: string,
        options: {
            limit?: number;
            sourceTypes?: DocumentSourceType[];
            minSimilarity?: number;
        } = {}
    ): Promise<SearchResult[]> {
        const { limit = 5, sourceTypes, minSimilarity = 0.7 } = options;

        // Generate embedding for query
        const queryEmbedding = await this.generateQueryEmbedding(query);

        // In production, search Supabase:
        // const results = await this.searchSupabase(queryEmbedding, limit, sourceTypes);

        // Mock results for now
        const mockResults: SearchResult[] = [
            {
                documentId: 'doc-ifrs-15',
                documentTitle: 'IFRS 15 - Revenue from Contracts with Customers',
                sourceType: 'IFRS_STANDARD',
                chunkText: 'Revenue is recognized when control of goods or services is transferred to the customer...',
                similarity: 0.92,
            },
            {
                documentId: 'doc-isa-315',
                documentTitle: 'ISA 315 - Identifying and Assessing Risks',
                sourceType: 'ISA_STANDARD',
                chunkText: 'The auditor shall identify and assess the risks of material misstatement...',
                similarity: 0.88,
            },
            {
                documentId: 'doc-rra-vat',
                documentTitle: 'RRA VAT Law 016/2018',
                sourceType: 'RRA_TAX_CODE',
                chunkText: 'The standard VAT rate in Rwanda is 18%. Exports are zero-rated...',
                similarity: 0.85,
            },
        ];

        return mockResults
            .filter(r => r.similarity >= minSimilarity)
            .filter(r => !sourceTypes || sourceTypes.includes(r.sourceType))
            .slice(0, limit);
    }

    /**
     * Generate embedding for a query.
     */
    async generateQueryEmbedding(query: string): Promise<number[]> {
        if (!this.openai) {
            return new Array(EMBEDDING_DIMENSIONS).fill(0).map(() => Math.random());
        }

        const response = await this.openai.embeddings.create({
            model: this.config.embeddingModel,
            input: query,
        });

        return response.data[0].embedding;
    }

    /**
     * Answer a question using RAG.
     */
    async answerQuestion(
        question: string,
        options: {
            sourceTypes?: DocumentSourceType[];
            contextLimit?: number;
        } = {}
    ): Promise<{
        answer: string;
        sources: SearchResult[];
        confidence: number;
    }> {
        const { sourceTypes, contextLimit = 5 } = options;

        // Step 1: Search for relevant context
        const searchResults = await this.search(question, {
            limit: contextLimit,
            sourceTypes,
            minSimilarity: 0.6,
        });

        if (searchResults.length === 0) {
            return {
                answer: 'No relevant information found in the knowledge base.',
                sources: [],
                confidence: 0,
            };
        }

        // Step 2: Build context
        const context = searchResults
            .map(r => `[${r.sourceType}] ${r.documentTitle}:\n${r.chunkText}`)
            .join('\n\n');

        // Step 3: Generate answer using LLM
        if (!this.openai) {
            return {
                answer: 'OpenAI API not configured. Context found but cannot generate answer.',
                sources: searchResults,
                confidence: 0.5,
            };
        }

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert Rwanda accounting, audit, and tax assistant. Answer questions based on the provided context from Rwanda regulatory documents (IFRS, ISA, RRA Tax Code, ICPAR, BNR). Always cite your sources. If the context doesn't contain relevant information, say so.`,
                },
                {
                    role: 'user',
                    content: `Context:\n${context}\n\nQuestion: ${question}`,
                },
            ],
            temperature: 0.3,
        });

        const answer = completion.choices[0]?.message?.content || 'Unable to generate answer.';
        const avgSimilarity = searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length;

        return {
            answer,
            sources: searchResults,
            confidence: avgSimilarity,
        };
    }

    // =========================================================================
    // DOCUMENT MANAGEMENT
    // =========================================================================

    /**
     * Get document by ID.
     */
    async getDocument(documentId: string): Promise<{
        id: string;
        title: string;
        sourceType: DocumentSourceType;
        version?: string;
        effectiveDate?: Date;
        chunkCount: number;
    } | null> {
        // In production, fetch from Supabase
        return null;
    }

    /**
     * List all documents.
     */
    async listDocuments(options: {
        sourceType?: DocumentSourceType;
        limit?: number;
        offset?: number;
    } = {}): Promise<Array<{
        id: string;
        title: string;
        sourceType: DocumentSourceType;
        chunkCount: number;
    }>> {
        // In production, fetch from Supabase
        return [];
    }

    /**
     * Delete a document.
     */
    async deleteDocument(documentId: string): Promise<boolean> {
        // In production, delete from Supabase
        return true;
    }

    // =========================================================================
    // RWANDA-SPECIFIC HELPERS
    // =========================================================================

    /**
     * Get IFRS standard guidance.
     */
    async getIFRSGuidance(standard: string): Promise<SearchResult[]> {
        return this.search(`IFRS ${standard} requirements and guidance`, {
            sourceTypes: ['IFRS_STANDARD'],
            limit: 3,
        });
    }

    /**
     * Get ISA procedure guidance.
     */
    async getISAGuidance(standard: string): Promise<SearchResult[]> {
        return this.search(`ISA ${standard} audit procedures`, {
            sourceTypes: ['ISA_STANDARD'],
            limit: 3,
        });
    }

    /**
     * Get RRA tax guidance.
     */
    async getRRATaxGuidance(taxType: 'VAT' | 'CIT' | 'PAYE' | 'RSSB'): Promise<SearchResult[]> {
        return this.search(`Rwanda ${taxType} requirements and compliance`, {
            sourceTypes: ['RRA_TAX_CODE', 'ICPAR_CIRCULAR'],
            limit: 5,
        });
    }

    /**
     * Get EAC/AfCFTA trade guidance.
     */
    async getTradeGuidance(tradeArea: 'EAC' | 'AfCFTA'): Promise<SearchResult[]> {
        return this.search(`${tradeArea} trade rules and origin requirements`, {
            sourceTypes: ['EAC_REGULATION', 'AFCFTA_RULE'],
            limit: 3,
        });
    }
}

// ============================================================================
// PRE-BUILT DOCUMENT TEMPLATES
// ============================================================================

/**
 * Rwanda regulatory document templates for ingestion.
 */
export const RWANDA_DOCUMENT_TEMPLATES: Partial<DocumentInput>[] = [
    // IFRS Standards
    {
        sourceType: 'IFRS_STANDARD',
        title: 'IFRS 15 - Revenue from Contracts with Customers',
        version: '2014',
        metadata: { category: 'revenue' },
    },
    {
        sourceType: 'IFRS_STANDARD',
        title: 'IFRS 16 - Leases',
        version: '2016',
        metadata: { category: 'leases' },
    },
    {
        sourceType: 'IFRS_STANDARD',
        title: 'IFRS 9 - Financial Instruments',
        version: '2014',
        metadata: { category: 'financial-instruments' },
    },
    {
        sourceType: 'IFRS_STANDARD',
        title: 'IAS 16 - Property, Plant and Equipment',
        version: '2003',
        metadata: { category: 'ppe' },
    },
    {
        sourceType: 'IFRS_STANDARD',
        title: 'IAS 19 - Employee Benefits',
        version: '2011',
        metadata: { category: 'employee-benefits' },
    },

    // ISA Standards
    {
        sourceType: 'ISA_STANDARD',
        title: 'ISA 315 - Identifying and Assessing Risks of Material Misstatement',
        version: '2019',
        metadata: { category: 'risk-assessment' },
    },
    {
        sourceType: 'ISA_STANDARD',
        title: 'ISA 320 - Materiality in Planning and Performing an Audit',
        version: '2009',
        metadata: { category: 'materiality' },
    },
    {
        sourceType: 'ISA_STANDARD',
        title: 'ISA 240 - The Auditor\'s Responsibilities Relating to Fraud',
        version: '2009',
        metadata: { category: 'fraud' },
    },
    {
        sourceType: 'ISA_STANDARD',
        title: 'ISA 701 - Communicating Key Audit Matters',
        version: '2015',
        metadata: { category: 'kam' },
    },

    // RRA Tax Code
    {
        sourceType: 'RRA_TAX_CODE',
        title: 'Rwanda VAT Law 016/2018',
        version: '2018',
        metadata: { taxType: 'VAT' },
    },
    {
        sourceType: 'RRA_TAX_CODE',
        title: 'Rwanda Income Tax Law',
        version: '2024',
        metadata: { taxType: 'CIT' },
    },
    {
        sourceType: 'RRA_TAX_CODE',
        title: 'RSSB Social Security Law',
        version: '2026',
        metadata: { taxType: 'RSSB' },
    },

    // ICPAR
    {
        sourceType: 'ICPAR_CIRCULAR',
        title: 'ICPAR Law 11/2008 - Establishing ICPAR',
        version: '2008',
    },
    {
        sourceType: 'ICPAR_CIRCULAR',
        title: 'ICPAR Circular on Key Audit Matters',
        version: '2019',
    },

    // BNR
    {
        sourceType: 'BNR_DIRECTIVE',
        title: 'BNR Prudential Regulations for Banks',
        version: '2023',
    },

    // Trade
    {
        sourceType: 'EAC_REGULATION',
        title: 'EAC Common External Tariff',
        version: '2022',
    },
    {
        sourceType: 'AFCFTA_RULE',
        title: 'AfCFTA Rules of Origin',
        version: '2021',
    },
];

/**
 * Factory function.
 */
export function createKnowledgeBase(config: KnowledgeBaseConfig): RwandaKnowledgeBase {
    return new RwandaKnowledgeBase(config);
}
